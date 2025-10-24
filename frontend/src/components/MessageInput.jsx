import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const fileInputRef = useRef(null);

  const { selectedUser, sendMessage } = useChatStore();
  const { socket } = useAuthStore();

  const inputRef = useRef(null);
  const typingInterval = useRef(null);

  // ------------------- TYPING INDICATOR -------------------
  useEffect(() => {
    if (!socket || !selectedUser?._id) return;

    const emitTyping = () => socket.emit("typing", { to: selectedUser._id });
    const emitStopTyping = () =>
      socket.emit("stopTyping", { to: selectedUser._id });

    const checkFocus = () => {
      if (document.activeElement === inputRef.current) {
        emitTyping();
      } else {
        emitStopTyping();
      }
    };

    typingInterval.current = setInterval(checkFocus, 500);

    return () => clearInterval(typingInterval.current);
  }, [selectedUser?._id, socket]);

  // ------------------- SEND MESSAGE -------------------
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (!selectedUser?._id) return;

    try {
      setIsImageLoading(true); // Start loading
      await sendMessage({ text: text.trim(), image: imagePreview });

      // Reset input & preview
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Stop typing after send
      socket.emit("stopTyping", { to: selectedUser._id });
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setIsImageLoading(false); // Stop loading
    }
  };

  // ------------------- CLEAR IMAGE PREVIEW -------------------
  const handleClearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 w-full">
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

      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 relative"
      >
        <input
          ref={inputRef}
          type="text"
          className="flex-1 input input-bordered rounded-lg input-sm sm:input-md"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isImageLoading}
        />

        <div className="flex items-center gap-2 relative">
          {/* Image button */}
          <button
            type="button"
            className="flex items-center justify-center btn btn-circle btn-sm sm:btn-sm relative"
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
              setIsImageLoading(true); // Loading while preview is generated
              reader.onloadend = () => {
                setImagePreview(reader.result);
                setIsImageLoading(false); // Done loading
              };
              reader.readAsDataURL(file);
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            className="flex items-center justify-center btn btn-circle btn-sm sm:btn-sm"
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
