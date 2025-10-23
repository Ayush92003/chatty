import { useState } from "react";
import axios from "axios";

const AddContact = ({ refreshContacts }) => {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");

  const handleAdd = async () => {
    try {
      const res = await axios.post("/api/contacts/add", {
        friendEmail: email,
        displayName,
      }); 
      setMessage(res.data.message);
      setEmail("");
      setDisplayName("");
      refreshContacts();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error adding contact");
    }
  };

  return (
    <div className="p-4 border rounded-md max-w-sm">
      <input
        type="email"
        placeholder="Friend's Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input input-bordered w-full mb-2"
      />
      <input
        type="text"
        placeholder="Display Name (optional)"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="input input-bordered w-full mb-2"
      />
      <button onClick={handleAdd} className="btn btn-primary w-full">
        Add Contact
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
};

export default AddContact;
