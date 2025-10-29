import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const Message = ({ message }) => {
  const { authUser } = useAuthStore();
  const { setReplyTo } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const messageText = message.text ?? message.message ?? "";
  const isSender =
    message.sender === authUser._id || message.senderId === authUser._id;

  // Right-click (desktop)
  const handleRightClick = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });
    setShowMenu(true);
  };

  // Long press (mobile)
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => setShowMenu(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(timerRef.current);

  // Swipe reply (mobile)
  let touchStartX = 0;
  const handleSwipeStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleSwipeEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchEndX - touchStartX > 80) handleReply();
  };

  const handleReply = () => {
    setReplyTo({
      _id: message._id,
      text: messageText,
      sender: {
        fullName:
          message.senderDetails?.fullName ||
          message.senderName ||
          (isSender ? "You" : "User"),
        _id: message.sender || message.senderId,
      },
    });
    setShowMenu(false);
    toast.success("Replying...");
  };

  const handleDeleteForMe = async () => {
    try {
      await axiosInstance.delete(`/messages/${message._id}/for-me`);
      setShowMenu(false);
      toast.success("Message deleted for you");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDeleteForEveryone = async () => {
    try {
      await axiosInstance.delete(`/messages/${message._id}/for-everyone`);
      setShowMenu(false);
      toast.success("Message deleted for everyone");
    } catch {
      toast.error("Failed to delete for everyone");
    }
  };

  return (
    <div
      className={`relative mb-2 flex ${
        isSender ? "justify-end" : "justify-start"
      }`}
      onContextMenu={handleRightClick}
      onTouchStart={(e) => {
        handleTouchStart(e);
        handleSwipeStart(e);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd(e);
        handleSwipeEnd(e);
      }}
    >
      <div
        className={`max-w-xs sm:max-w-sm md:max-w-md p-2 rounded-lg relative flex flex-col ${
          isSender
            ? "bg-primary text-white items-end"
            : "bg-base-200 text-base-content items-start"
        }`}
      >
        {/* --- Reply snippet --- */}
        {message.replyTo && (
          <div className="text-xs text-gray-300 border-l-2 border-gray-400 pl-2 mb-1 opacity-80 self-start">
            Replying to:{" "}
            <span className="font-semibold text-white">
              {message.replyTo.sender?.fullName || "User"}
            </span>{" "}
            — {message.replyTo.text || "📷 Image"}
          </div>
        )}

        {/* --- Main message text --- */}
        <div className="break-words w-full">
          {message.isDeletedForEveryone ? (
            <p className="italic text-sm text-zinc-400">
              This message was deleted
            </p>
          ) : (
            <p>{messageText}</p>
          )}
        </div>

        {/* --- Timestamp --- */}
        <div className="text-[10px] text-gray-300 mt-2 w-full flex justify-end">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* --- Message menu --- */}
      {showMenu && (
        <div
          className="absolute z-50 bg-base-300 rounded-lg shadow-md p-2"
          style={{ top: menuPos.y, left: menuPos.x }}
          onMouseLeave={() => setShowMenu(false)}
        >
          <button
            onClick={handleReply}
            className="block w-full text-left px-4 py-2 hover:bg-base-200 rounded"
          >
            Reply
          </button>

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
