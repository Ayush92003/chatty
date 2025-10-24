/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */

import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus } from "lucide-react";
import { axiosInstance } from "../lib/axios";

const Sidebar = () => {
  const { users, selectedUser, setSelectedUser, isUsersLoading, getUsers } =
    useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    getUsers();
  }, []);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  const handleAddContact = (user) => {
    setEmail(user.email);
    setName(user.fullName || "");
    setShowAddModal(true); 
  };

  const handleAddModalContact = async () => {
    if (!email.trim()) {
      alert("Email is required!");
      return;
    }
    try {
      await axiosInstance.post("/contacts/add", {
        email: email.trim(),
        name: name.trim(), 
      });
      await getUsers(); 
      setEmail("");
      setName("");
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add contact");
    }
  };

  return (
    <aside className="relative h-full w-full md:w-full lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      {/* Header */}
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">
            ({onlineUsers.length - 1} online)
          </span>
        </div>
      </div>

      {/* Contact list */}
      <div className="overflow-y-auto flex-1 w-full py-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const isSaved = user.isSaved ?? false; 
            return (
              <div
                key={user._id}
                className={`flex justify-between items-center w-full p-3 hover:bg-base-300 transition-colors ${
                  selectedUser?._id === user._id
                    ? "bg-base-300 ring-1 ring-base-300"
                    : ""
                }`}
              >
                <button
                  className="flex items-center gap-3 min-w-0 text-left flex-1"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="relative">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                    )}
                  </div>

                  <div className="block min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-zinc-400">
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>

                {/* Show Add button for unsaved users */}
                {!isSaved && (
                  <button
                    onClick={() => handleAddContact(user)}
                    className="btn btn-xs btn-outline btn-primary ml-2 flex-shrink-0"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-zinc-500 py-10">No contacts yet</div>
        )}
      </div>

      {/* Add Contact Button (Desktop) */}
      <div className="hidden lg:block p-4 border-t border-base-300">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="size-5" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Floating Add Button (Mobile) */}
      <div className="lg:hidden absolute bottom-4 right-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-circle btn-primary shadow-md"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-base-100 p-6 rounded-xl w-[90%] max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Add New Contact
            </h3>

            <input
              type="email"
              placeholder="Enter contact email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered w-full mb-3"
              required
            />
            <input
              type="text"
              placeholder="Enter contact name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModalContact}
                className="btn btn-sm btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
