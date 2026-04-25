import { NonRetriableError } from "inngest";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { inngest } from "../client.js";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {

    const { ticketId } = event.data;

    // STEP 1: Fetch ticket
    const ticket = await step.run("fetch-ticket", async () => {
      const t = await Ticket.findById(ticketId);
      if (!t) throw new NonRetriableError("Ticket not found");
      return t;
    });

    // STEP 2: Fetch creator
    const creator = await step.run("fetch-creator", async () => {
      const u = await User.findById(ticket.createdBy);
      if (!u) throw new NonRetriableError("User not found");
      return u;
    });

    // STEP 3: Send confirmation email
    await step.run("send-ticket-created-email", async () => {
      await sendMail(
        creator.email,
        "Ticket created",
        `Hi ${creator.name}, your ticket "${ticket.title}" has been created.`
      );
    });

    // STEP 4: AI processing
    const aiResponse = await step.run("analyze-ticket", async () => {
      return await analyzeTicket(ticket);
    });

    // STEP 5: Update ticket with AI data
    const relatedSkills = await step.run("update-ticket-ai", async () => {

      const validPriorities = ["low", "medium", "high"];

      const update = {
        aiSummary: aiResponse?.summary || "",
        aiSuggestedSolution: aiResponse?.solution || "",
        relatedSkills: aiResponse?.relatedSkills || [],
        priority: validPriorities.includes(aiResponse?.priority)
          ? aiResponse.priority
          : "medium",
        status: "in_progress"
      };

      await Ticket.findByIdAndUpdate(ticketId, update);

      return update.relatedSkills;
    });

    // STEP 6: Find moderator
    const moderator = await step.run("assign-moderator", async () => {

      let user = await User.find({
        roles: "moderator",
        skills: { $in: relatedSkills },
        isAvailable: true
      }).sort({ assignedTicketsCount: 1 }).limit(1);

      user = user[0];

      if (!user) {
        user = await User.findOne({ roles: "admin" });
      }

      await Ticket.findByIdAndUpdate(ticketId, {
        assignedTo: user?._id || null,
        status: "assigned"
      });

      if (user) {
        await User.findByIdAndUpdate(user._id, {
          $inc: { assignedTicketsCount: 1 }
        });
      }

      return user;
    });

    // STEP 7: Notify moderator
    await step.run("notify-moderator", async () => {
      if (!moderator) return;

      const finalTicket = await Ticket.findById(ticketId);

      await sendMail(
        moderator.email,
        "New ticket assigned",
        `Hi ${moderator.name}, you have been assigned ticket "${finalTicket.title}".`
      );
    });

    return { success: true };
  }
);