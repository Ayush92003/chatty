/* eslint-disable no-unused-vars */
import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Smile } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const typingInterval = useRef(null);

  const { selectedUser, sendMessage, replyTo, setReplyTo, clearReply } =
    useChatStore();
  const { socket } = useAuthStore();

  // ------------------- TYPING INDICATOR -------------------
  useEffect(() => {
    if (!socket || !selectedUser?._id) return;

    const emitTyping = () => socket.emit("typing", { to: selectedUser._id });
    const emitStopTyping = () =>
      socket.emit("stopTyping", { to: selectedUser._id });

    const checkFocus = () => {
      if (document.activeElement === inputRef.current) emitTyping();
      else emitStopTyping();
    };

    typingInterval.current = setInterval(checkFocus, 500);
    return () => clearInterval(typingInterval.current);
  }, [selectedUser?._id, socket]);

  // ------------------- OUTSIDE CLICK (Emoji Picker) -------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------- SEND MESSAGE -------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (!selectedUser?._id) return;

    try {
      setIsImageLoading(true);
      // sendMessage uses store replyTo automatically (store handles payload)
      await sendMessage({ text: text.trim(), image: imagePreview });

      setText("");
      setImagePreview(null);
      clearReply();
      if (fileInputRef.current) fileInputRef.current.value = "";
      socket.emit("stopTyping", { to: selectedUser._id });
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // ------------------- CLEAR IMAGE PREVIEW -------------------
  const handleClearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ------------------- ADD EMOJI -------------------
  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  return (
    <div className="p-4 w-full relative border-t border-base-300">
      {/* ----- Reply Preview Box ----- */}
      {replyTo && (
        <div className="flex justify-between items-center mb-2 bg-base-200 rounded-lg p-2 border-l-4 border-primary">
          <div className="truncate text-sm text-gray-600 max-w-[80%]">
            Replying to:{" "}
            <span className="font-semibold">
              {replyTo.sender?.fullName || "User"}
            </span>{" "}
            — {replyTo.text || "📷 Image"}
          </div>
          <button
            onClick={() => clearReply()}
            className="p-1 hover:bg-base-300 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative w-32 sm:w-40">
          <img
            src={imagePreview}
            alt="preview"
            className={`rounded-md border transition-opacity ${
              isImageLoading ? "opacity-50 animate-pulse" : "opacity-100"
            }`}
          />
          <button
            type="button"
            onClick={handleClearImage}
            className="absolute top-1 right-1 bg-gray-200 hover:bg-gray-300 rounded-full p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 relative"
      >
        {/* Emoji Button (Desktop Only) */}
        <div className="hidden sm:block relative" ref={emojiPickerRef}>
          <button
            type="button"
            className="btn btn-circle btn-sm"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
          >
            <Smile size={20} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme="dark"
                autoFocusSearch={false}
                width={300}
              />
            </div>
          )}
        </div>

        {/* Text Input */}
        <textarea
          ref={inputRef}
          rows="1"
          className="flex-1 textarea textarea-bordered rounded-lg textarea-sm sm:textarea-md resize-none overflow-y-scroll no-scrollbar max-h-32"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isImageLoading}
        />

        {/* Image + Send */}
        <div className="flex items-center gap-2 relative">
          {/* Image button */}
          <button
            type="button"
            className="btn btn-circle btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImageLoading}
          >
            <Image size={20} />
            {imagePreview && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
            )}
          </button>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
              }
              const reader = new FileReader();
              setIsImageLoading(true);
              reader.onloadend = () => {
                setImagePreview(reader.result);
                setIsImageLoading(false);
              };
              reader.readAsDataURL(file);
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            className="btn btn-circle btn-sm"
            disabled={isImageLoading}
          >
            {isImageLoading ? (
              <div className="w-4 h-4 border-2 border-dashed border-gray-500 rounded-full animate-spin"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
