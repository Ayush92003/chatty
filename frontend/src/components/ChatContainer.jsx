/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { FaTrash, FaCopy, FaEdit, FaTimes, FaReply } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { formatMessageTime } from "../lib/utils";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import TypingIndicator from "./TypingIndicator";

const ChatContainer = () => {
  const {
    messages = [],
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    isTyping,
    selectedMessages = [],
    setSelectedMessages,
    isSelectMode,
    setIsSelectMode,
    deleteSelectedMessages,
    replyTo,
    setReplyTo,
  } = useChatStore();

  const { authUser } = useAuthStore();

  const messageEndRef = useRef(null);
  const actionRef = useRef(null);
  const pressTimer = useRef(null);
  const lastTapRef = useRef(0);

  const [showActionsFor, setShowActionsFor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalPosition, setModalPosition] = useState({
    left: "50%",
    translateX: "-50%",
  });
  const [zoomedImage, setZoomedImage] = useState(null);

  // ------------------- FETCH MESSAGES -------------------
  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]);

  // ------------------- SCROLL DIRECTLY TO BOTTOM -------------------
  useEffect(() => {
    if (
      messageEndRef.current &&
      Array.isArray(messages) &&
      messages.length > 0
    ) {
      messageEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // ------------------- CLOSE ACTION MODAL -------------------
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionRef.current && !actionRef.current.contains(e.target)) {
        setShowActionsFor(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // ------------------- RESPONSIVE MODAL -------------------
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 580) {
        setModalPosition({ left: "10%", translateX: "0%" });
      } else {
        setModalPosition({ left: "50%", translateX: "-50%" });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ------------------- EXIT SELECT MODE -------------------
  useEffect(() => {
    if (
      Array.isArray(selectedMessages) &&
      selectedMessages.length === 0 &&
      isSelectMode
    ) {
      setIsSelectMode(false);
    }
  }, [selectedMessages, isSelectMode]);

  // ------------------- DELETE FUNCTIONS -------------------
  const handleDeleteForMe = async (msgId) => {
    try {
      await axiosInstance.delete(`/messages/${msgId}/for-me`);
      setShowDeleteModal(false);
      setShowActionsFor(null);
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteForEveryone = async (msgId) => {
    try {
      await axiosInstance.delete(`/messages/${msgId}/for-everyone`);
      setShowDeleteModal(false);
      setShowActionsFor(null);
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setShowActionsFor(null);
  };

  const openDeleteModal = (msgId) => {
    setDeleteTarget(msgId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setShowActionsFor(null);
  };

  // ------------------- REPLY FUNCTION (uses store) -------------------
  const handleReply = (message) => {
    // normalize message text
    const msgText = message?.text ?? message?.message ?? "";
    const senderName =
      message?.senderDetails?.fullName ||
      message?.senderName ||
      (message?.senderId === authUser._id ? "You" : "User");

    setReplyTo({
      _id: message?._id,
      text: msgText,
      sender: {
        fullName: senderName,
        _id: message?.senderId ?? message?.sender,
      },
    });

    setShowActionsFor(null);
  };

  // ------------------- TOUCH + LONG PRESS + DOUBLE TAP -------------------
  const handleTouchStart = (msgId) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapRef.current;

    if (tapLength < 300 && tapLength > 0) {
      setIsSelectMode(true);
      setSelectedMessages((prev) =>
        Array.isArray(prev) && prev.includes(msgId)
          ? prev.filter((id) => id !== msgId)
          : [...(prev || []), msgId]
      );
      lastTapRef.current = 0;
    } else {
      pressTimer.current = setTimeout(() => {
        setIsSelectMode(true);
        setSelectedMessages((prev) =>
          Array.isArray(prev) && prev.includes(msgId)
            ? prev
            : [...(prev || []), msgId]
        );
        if (navigator.vibrate) navigator.vibrate(50);
      }, 600);

      lastTapRef.current = currentTime;
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // ------------------- LOADING SKELETON -------------------
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // ------------------- CHAT UI -------------------
  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      {/* Multi-select Toolbar */}
      {isSelectMode &&
        Array.isArray(selectedMessages) &&
        selectedMessages.length > 0 && (
          <div className="absolute top-0 left-0 w-full bg-base-200 border-b border-base-300 z-40 flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">
              {selectedMessages.length} selected
            </span>
            <div className="flex gap-2">
              <button
                className="btn btn-error btn-sm text-white"
                onClick={deleteSelectedMessages}
              >
                Delete
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSelectedMessages([]);
                  setIsSelectMode(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      {/* Floating Action Modal */}
      <AnimatePresence>
        {showActionsFor && !isSelectMode && (
          <motion.div
            ref={actionRef}
            key="msg-action-modal"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="absolute w-72 max-w-[90vw] bg-base-100 border rounded-lg shadow-lg z-50 p-3 flex flex-col gap-2"
            style={{
              top: "4rem",
              left: modalPosition.left,
              transform: `translateX(${modalPosition.translateX})`,
            }}
          >
            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-base-200 transition"
              onClick={() =>
                handleCopyMessage(
                  messages.find((m) => m._id === showActionsFor)?.text ||
                    messages.find((m) => m._id === showActionsFor)?.message ||
                    ""
                )
              }
            >
              <FaCopy /> Copy
            </button>

            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-base-200 transition"
              onClick={() =>
                handleReply(messages.find((m) => m._id === showActionsFor))
              }
            >
              <FaReply /> Reply
            </button>

            {messages.find((m) => m._id === showActionsFor)?.senderId ===
              authUser._id && (
              <button
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-base-200 transition text-blue-600"
                onClick={() => alert("Edit feature coming soon")}
              >
                <FaEdit /> Edit
              </button>
            )}

            <button
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-base-200 transition text-red-600"
              onClick={() => openDeleteModal(showActionsFor)}
            >
              <FaTrash /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(Array.isArray(messages) ? messages : []).map((message) => {
          const isSender = message.senderId === authUser._id;
          const isDeleted =
            message.isDeletedForEveryone || message.text === "deleted";

          // message text compatibility
          const messageText = message.text ?? message.message ?? "";

          return (
            <div
              key={message._id}
              className={`chat ${isSender ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isSender
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div
                className={`chat-bubble relative cursor-pointer break-words max-w-[75%] sm:max-w-[60%] px-3 py-2 transition ${
                  Array.isArray(selectedMessages) &&
                  selectedMessages.includes(message._id)
                    ? "bg-primary/30 border border-primary"
                    : "hover:bg-base-200"
                }`}
                style={{ whiteSpace: "pre-wrap" }}
                onTouchStart={() => handleTouchStart(message._id)}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                  if (isSelectMode) {
                    if (selectedMessages.includes(message._id)) {
                      setSelectedMessages(
                        selectedMessages.filter((id) => id !== message._id)
                      );
                    } else {
                      setSelectedMessages([...selectedMessages, message._id]);
                    }
                  } else {
                    if (!isDeleted && message.image) {
                      setZoomedImage(message.image);
                    } else if (!isDeleted) {
                      setShowActionsFor(message._id);
                    }
                  }
                }}
              >
                {!isDeleted && message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}

                {message.replyTo && (
                  <div className="text-xs text-gray-500 border-l-2 border-primary pl-2 mb-1">
                    Replying to:{" "}
                    {message.replyTo.text ?? message.replyTo.message}
                  </div>
                )}

                <p className="text-sm">
                  {isDeleted ? "This message was deleted" : messageText}
                </p>

                <span className="absolute text-[10px] text-gray-400 bottom-1 right-2">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {isTyping && selectedUser && (
            <motion.div
              className="chat chat-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={selectedUser.profilePic || "/avatar.png"}
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-bubble p-2">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messageEndRef} />
      </div>

      {/* Message Input (reads replyTo from store internally) */}
      <MessageInput />

      {/* Zoomed Image Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            key="zoom-modal"
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative">
              <img
                src={zoomedImage}
                alt="Zoomed"
                className="max-h-[90vh] max-w-[90vw] rounded-lg"
              />
              <button
                className="absolute top-2 right-2 text-white text-xl p-1 bg-black/50 rounded-full"
                onClick={() => setZoomedImage(null)}
              >
                <FaTimes />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box w-80 max-w-[90vw] p-5">
            <h3 className="font-bold text-lg text-center mb-4">
              Delete Message?
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDeleteForMe(deleteTarget)}
                className="text-red-500 text-base w-full text-left hover:bg-red-100 hover:text-red-600 px-2 py-1 rounded-xl transition-colors duration-200"
              >
                Delete for Me
              </button>
              {messages.find((m) => m._id === deleteTarget)?.senderId ===
                authUser._id && (
                <button
                  onClick={() => handleDeleteForEveryone(deleteTarget)}
                  className="text-red-500 text-base w-full text-left hover:bg-red-100 hover:text-red-600 px-2 py-1 rounded transition-colors duration-200"
                >
                  Delete for Everyone
                </button>
              )}
              <button
                onClick={closeDeleteModal}
                className="text-gray-600 text-base w-full text-left hover:bg-gray-100 px-2 py-1 rounded-xl transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
