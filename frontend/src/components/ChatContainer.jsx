/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { FaTrash, FaCopy, FaEdit } from "react-icons/fa";
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
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const actionRef = useRef(null);
  const pressTimer = useRef(null);

  const [showActionsFor, setShowActionsFor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modalPosition, setModalPosition] = useState({
    left: "50%",
    translateX: "-50%",
  });
  const [lastTap, setLastTap] = useState(0); // for mobile double tap

  // ------------------- FETCH MESSAGES -------------------
  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]);

  // ------------------- AUTO SCROLL -------------------
  useEffect(() => {
    if (messageEndRef.current && Array.isArray(messages)) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  // ------------------- TOUCH + LONG PRESS + DOUBLE TAP -------------------
  const handleTouchStart = (msgId) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    // Double-tap → toggle selection
    if (tapLength < 300 && tapLength > 0) {
      setIsSelectMode(true);
      setSelectedMessages((prev) =>
        Array.isArray(prev) && prev.includes(msgId)
          ? prev.filter((id) => id !== msgId)
          : [...(prev || []), msgId]
      );
    } else {
      // Long press → start select mode
      pressTimer.current = setTimeout(() => {
        setIsSelectMode(true);
        setSelectedMessages((prev) =>
          Array.isArray(prev) && prev.includes(msgId)
            ? prev
            : [...(prev || []), msgId]
        );
        if (navigator.vibrate) navigator.vibrate(50); // haptic feedback
      }, 600);
    }

    setLastTap(currentTime);
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
                  messages.find((m) => m._id === showActionsFor)?.text || ""
                )
              }
            >
              <FaCopy /> Copy
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

          return (
            <div
              key={message._id}
              className={`chat ${isSender ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
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
                    !isDeleted && setShowActionsFor(message._id);
                  }
                }}
                onDoubleClick={() => {
                  if (!isSelectMode) {
                    setIsSelectMode(true);
                    setSelectedMessages([message._id]);
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

                <p className="text-sm">
                  {isDeleted ? "This message was deleted" : message.text}
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

      <MessageInput />

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
