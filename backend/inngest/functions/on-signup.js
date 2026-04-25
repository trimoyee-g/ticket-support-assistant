import { NonRetriableError } from "inngest";
import User from "../../models/user.js";
import { inngest } from "../client.js";
import { sendMail } from "../../utils/mailer.js";

export const onUserSignUp = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    const { email } = event.data;

    // STEP 1: Fetch user
    const user = await step.run("fetch-user-by-email", async () => {
      const userObject = await User.findOne({ email });

      if (!userObject) {
        throw new NonRetriableError("User not found in database");
      }

      return userObject;
    });

    // STEP 2: Send email
    await step.run("send-welcome-email", async () => {
      const subject = "Welcome to the app!";
      const message = `Hi ${user.name},

        Welcome to the platform! We're excited to have you onboard.

        If you need any help, feel free to reach out.

        Best regards,  
        Team`;

      await sendMail(user.email, subject, message);
    });

    return { success: true };
  },
);
