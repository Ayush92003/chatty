import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { FiMoreVertical } from "react-icons/fi";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, getMessages } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // ✅ Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearChatForMe = async () => {
    try {
      await axiosInstance.delete(`/messages/clear/${selectedUser._id}/for-me`);
      setShowMenu(false);
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300 relative bg-base-100">
      <div className="flex items-center justify-between">
        {/* Left side: User Info */}
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-base-content">
              {selectedUser.fullName}
            </h3>
            <p
              className={`text-sm ${
                onlineUsers.includes(selectedUser._id)
                  ? "text-success"
                  : "text-base-content/70"
              }`}
            >
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Right side: 3-dot menu + close */}
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          <button
            className="btn btn-ghost btn-sm hover:bg-base-200 rounded-full"
            onClick={() => setShowMenu(!showMenu)}
          >
            <FiMoreVertical size={20} />
          </button>

          <button
            className="btn btn-ghost btn-sm hover:bg-base-200 rounded-full"
            onClick={() => setSelectedUser(null)}
          >
            <X size={18} />
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute top-10 right-0 w-44 bg-base-100 shadow-xl border border-base-300 rounded-xl z-50 animate-fade-in">
              <ul className="menu menu-sm p-2">
                <li>
                  <button
                    onClick={clearChatForMe}
                    className="flex items-center gap-2 text-error font-medium hover:bg-error/10 rounded-lg px-3 py-2 transition-all"
                  >
                    🗑️ Clear Chat
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="text-base-content/80 hover:bg-base-200 rounded-lg px-3 py-2"
                  >
                    Cancel
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
