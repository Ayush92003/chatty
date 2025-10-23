import { useEffect, useState } from "react";
import axios from "axios";

const ChatList = () => {
  const [contacts, setContacts] = useState([]);

  const fetchContacts = async () => {
    try {
      const res = await axios.get("/api/contacts"); 
      setContacts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="p-4 border rounded-md max-w-sm">
      <h2 className="font-bold mb-2">Chats</h2>
      {contacts.length === 0 ? (
        <p>No contacts yet.</p>
      ) : (
        <ul>
          {contacts.map((c) => (
            <li key={c.user._id} className="p-2 border-b flex items-center">
              <img
                src={c.user.profilePic}
                alt={c.displayName || c.user.fullName}
                className="w-10 h-10 rounded-full mr-2"
              />
              <span>{c.displayName || c.user.fullName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
