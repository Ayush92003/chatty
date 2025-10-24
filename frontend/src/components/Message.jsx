import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const Message = ({ message }) => {
  const { authUser } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const isSender = message.sender === authUser._id;

  const handleRightClick = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });
    setShowMenu(true);
  };

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(timerRef.current);

  const handleDeleteForMe = async () => {
    try {
      await axiosInstance.delete(`/messages/${message._id}/for-me`);
      setShowMenu(false);
      toast.success("Message deleted for you");
      window.location.reload();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDeleteForEveryone = async () => {
    try {
      await axiosInstance.delete(`/messages/${message._id}/for-everyone`);
      setShowMenu(false);
      toast.success("Message deleted for everyone");
      window.location.reload();
    } catch {
      toast.error("Failed to delete for everyone");
    }
  };

  const renderMessageText = () => {
    if (message.isDeletedForEveryone) {
      return (
        <p className="italic text-sm text-zinc-400">This message was deleted</p>
      );
    } else {
      return <p>{message.message}</p>;
    }
  };

  return (
    <div
      className={`relative mb-2 flex ${
        isSender ? "justify-end" : "justify-start"
      }`}
      onContextMenu={handleRightClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`max-w-xs p-2 rounded-lg ${
          isSender ? "bg-primary text-white" : "bg-base-200 text-base-content"
        }`}
      >
        {renderMessageText()}
      </div>

      {showMenu && (
        <div
          className="absolute z-50 bg-base-300 rounded-lg shadow-md p-2"
          style={{ top: menuPos.y, left: menuPos.x }}
          onMouseLeave={() => setShowMenu(false)}
        >
          <button
            onClick={handleDeleteForMe}
            className="block w-full text-left px-4 py-2 hover:bg-base-200 rounded"
          >
            Delete for me
          </button>

          {isSender && (
            <button
              onClick={handleDeleteForEveryone}
              className="block w-full text-left px-4 py-2 hover:bg-error/10 text-error rounded"
            >
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
