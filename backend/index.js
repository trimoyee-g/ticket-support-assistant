import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import userRoutes from './routes/user.js';
import ticketRoutes from './routes/ticket.js';
import { deleteExpiredTickets } from './controllers/ticket.js';
import {serve} from "inngest/express";
import {inngest} from "./inngest/client.js";
import { onUserSignUp } from './inngest/functions/on-signup.js';
import { onTicketCreated } from './inngest/functions/on-ticket-create.js';

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/inngest", serve({
    client: inngest,
    functions: [onUserSignUp, onTicketCreated],
}));
mongoose
        .connect(process.env.MONGO_URI)
        .then(() => {
                console.log('Connected to MongoDB');

                const server = createServer(app);

                const io = new SocketServer(server, {
                    cors: {
                        origin: process.env.FRONTEND_URL || '*',
                        methods: ['GET', 'POST']
                    }
                });

                // verify token passed in socket auth
                io.use((socket, next) => {
                    try {
                        const token = socket.handshake.auth?.token;
                        if (!token) return next(new Error('Unauthorized'));
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        socket.user = decoded;
                        return next();
                    } catch (err) {
                        return next(new Error('Unauthorized'));
                    }
                });

                // export io for controllers via socket helper
                import('./socket.js').then(({ setIo }) => setIo(io));

                io.on('connection', (socket) => {
                    socket.on('join', (ticketId) => {
                        socket.join(`ticket_${ticketId}`);
                    });

                    socket.on('newMessage', async (payload) => {
                        try {
                            const { ticketId, text, role, name } = payload || {};
                            if (!ticketId || !text) return;
                            const Ticket = (await import('./models/ticket.js')).default;

                            const message = {
                                sender: socket.user?.id || null,
                                name: name || socket.user?.email || 'Unknown',
                                role: role || 'user',
                                text,
                                createdAt: new Date()
                            };

                            const ticket = await Ticket.findById(ticketId);
                            if (!ticket) return;

                            ticket.messages = ticket.messages || [];
                            ticket.messages.push(message);
                            await ticket.save();

                            io.to(`ticket_${ticketId}`).emit('message', { ticketId, message });
                        } catch (err) {
                            console.error('Socket newMessage error', err);
                        }
                    });
                });

                server.listen(PORT, () => {
                        console.log(`Server running on port ${PORT}`);
                });

                // Run cleanup once on startup and then every 24 hours
                deleteExpiredTickets();
                setInterval(() => {
                    deleteExpiredTickets();
                }, 24 * 60 * 60 * 1000);
        })
        .catch(err => console.error('Error connecting to MongoDB:', err));