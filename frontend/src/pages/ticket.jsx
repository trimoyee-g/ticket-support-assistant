import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { io as ioClient } from "socket.io-client";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const socketRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/api/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          // backend returns the ticket object directly
          setTicket(data);
          setMessages(data.messages || []);
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();

    // connect socket
    try {
      const socket = ioClient(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SERVER_URL, {
        auth: { token },
      });
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('join', id);
      });
      socket.on('message', ({ ticketId, message }) => {
        if (ticketId === id) setMessages((m) => [...m, message]);
      });
    } catch (err) {
      console.warn('Socket connection failed', err);
    }
  }, [id]);

  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <h3 className="text-xl font-semibold">{ticket.title}</h3>
        <p>{ticket.description}</p>

        {/* Conditionally render extended details */}
        {ticket.status && (
          <>
            <div className="divider">Metadata</div>
            <p>
              <strong>Status:</strong> {ticket.status}
            </p>
            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket.relatedSkills?.length > 0 && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {ticket.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {ticket.assignedTo?.email}
              </p>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
          </>
        )}

        <div className="divider">Conversation</div>
        <div className="space-y-2 max-h-80 overflow-auto p-2 bg-gray-900 rounded">
          {messages.map((m, i) => (
            <div key={i} className="p-2 rounded bg-gray-800">
              <div className="text-sm text-gray-400">{m.name} • {m.role}</div>
              <div className="mt-1">{m.text}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          <input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Write a message..." className="flex-1 input input-bordered" />
          <button className="btn" onClick={async () => {
            if (!newText.trim()) return;
            const payload = { ticketId: id, text: newText.trim(), role: 'user' };
            // prefer socket emit
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('newMessage', payload);
            } else {
              // fallback to HTTP
              await fetch(`${import.meta.env.VITE_SERVER_URL}/api/tickets/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ text: newText.trim(), role: 'user' })
              });
            }
            setNewText('');
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}