import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import socket from "../socket";

const sendSound = new Audio("/send.mp3");

interface User {
  id: string;
  name: string;
  email: string;
  lastMessage?: string;
}

interface ChatMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  isDelivered?: boolean;
  isSeen?: boolean;
}

const Chat = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myId = localStorage.getItem("userId");

  // logout
  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // USERS
  const fetchUsers = async () => {
    const res = await api.get("/users");
    setUsers(res.data.filter((u: User) => u.id !== myId));
  };

  // MESSAGES
  const fetchMessages = async (receiverId: string) => {
    const res = await api.get(`/messages/${myId}/${receiverId}`);
    setMessages(res.data);
  };

  // SEND MESSAGE (instant UI)
  const sendMessage = async () => {
    if (!selectedUser || !message.trim()) return;

    const newMessage = {
      senderId: myId,
      receiverId: selectedUser.id,
      text: message,
    };

    const res = await api.post("/messages/send", newMessage);

    setMessages((prev) => [...prev, res.data]);
    socket.emit("sendMessage", res.data);

    setMessage("");
    sendSound.play();
  };

  // INIT USERS
  useEffect(() => {
    fetchUsers();
  }, []);

  // SOCKET
  useEffect(() => {
    if (myId) socket.emit("join", myId);

    socket.on("receiveMessage", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("messageDelivered", (id: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isDelivered: true } : m
        )
      );
    });

    socket.on("messagesSeen", ({ receiverId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === myId && m.receiverId === receiverId
            ? { ...m, isSeen: true }
            : m
        )
      );
    });

    socket.on("onlineUsers", (users: string[]) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageDelivered");
      socket.off("messagesSeen");
      socket.off("onlineUsers");
    };
  }, []);

  // AUTO SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SEEN EVENT
  useEffect(() => {
    if (!selectedUser) return;

    socket.emit("messageSeen", {
      senderId: selectedUser.id,
      receiverId: myId,
    });
  }, [selectedUser]);

  return (
    <div className="h-screen flex bg-gray-100">

      {/* SIDEBAR */}
      <div className="w-80 bg-white border-r flex flex-col">

        <div className="p-4 border-b flex justify-between">
          <h1 className="text-3xl font-bold text-pink-600">Convoy</h1>

          <button onClick={logout} className="bg-red-500 text-white px-2 py-1 rounded">
            Logout
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                setSelectedUser(user);
                fetchMessages(user.id);
              }}
              className="p-4 hover:bg-gray-100 cursor-pointer flex justify-between"
            >
              <div>
                <h3 className="font-semibold">{user.name}</h3>

                <p className="text-xs text-gray-500 truncate w-40">
                  {user.lastMessage || ""}
                </p>
              </div>

              {onlineUsers.includes(user.id) && (
                <span className="text-green-500 text-xs">●</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="bg-white border-b p-4">
          {selectedUser ? (
            <div className="flex items-center gap-3">

              <img
                src={`https://ui-avatars.com/api/?name=${selectedUser.name}`}
                className="w-10 h-10 rounded-full"
              />

              <div>
                <h2 className="font-semibold">{selectedUser.name}</h2>

                {onlineUsers.includes(selectedUser.id) ? (
                  <p className="text-green-500 text-xs">● Online</p>
                ) : (
                  <p className="text-gray-400 text-xs">● Offline</p>
                )}
              </div>

            </div>
          ) : (
            <h2 className="font-semibold">Welcome to Convoy 💬</h2>
          )}
        </div>

        {/* MESSAGES */}
        <div className="flex-1 p-4 overflow-y-auto">

          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a user to start chatting
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-2 flex ${
                    msg.senderId === myId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`p-2 rounded max-w-xs ${
                      msg.senderId === myId
                        ? "bg-pink-600 text-white"
                        : "bg-white text-black shadow"
                    }`}
                  >
                    {msg.text}

                    {/* ✔✔ TICKS ONLY */}
                    {msg.senderId === myId && (
                      <div className="text-[12px] flex justify-end mt-1">

                        {!msg.isDelivered && !msg.isSeen && (
                          <span className="text-gray-300">✔</span>
                        )}

                        {msg.isDelivered && !msg.isSeen && (
                          <span className="text-gray-400">✔✔</span>
                        )}

                        {msg.isSeen && (
                          <span className="text-blue-500">✔✔</span>
                        )}

                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef}></div>
            </>
          )}
        </div>

        {/* INPUT */}
        <div className="p-3 border-t flex gap-2">

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 border p-2 rounded"
            placeholder="Type message..."
          />

          <button
            onClick={sendMessage}
            className="bg-pink-600 text-white px-4 rounded cursor-pointer hover:bg-pink-700 transition"
          >
            Send
          </button>

        </div>
      </div>
    </div>
  );
};

export default Chat;