/* eslint-disable no-unused-vars */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [],
      users: [],
      selectedUser: null,
      selectedMessages: [],
      isSelectMode: false,
      isUsersLoading: false,
      isMessagesLoading: false,
      isSending: false,
      isTyping: false,

      // Reply state
      replyTo: null,
      setReplyTo: (msg) => set({ replyTo: msg }),
      clearReply: () => set({ replyTo: null }),

      // Basic setters
      setMessages: (messages) => set({ messages }),
      setUsers: (users) => set({ users }),
      setSelectedUser: (selectedUser) => set({ selectedUser }),
      setIsTyping: (typing) => set({ isTyping: typing }),
      setSelectedMessages: (selectedMessages) =>
        set({
          selectedMessages: Array.isArray(selectedMessages)
            ? selectedMessages
            : [],
        }),
      setIsSelectMode: (mode) => set({ isSelectMode: !!mode }),

      // ------------------- USERS -------------------
      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const authUser = useAuthStore.getState().authUser;
          if (!authUser) return;

          const contactsRes = await axiosInstance.get("/contacts");
          const savedContacts = contactsRes.data.map((user) => ({
            ...user,
            isSaved: true,
          }));

          const recentRes = await axiosInstance.get("/messages/users");
          const recentChats =
            recentRes.data
              ?.filter((u) => !savedContacts.find((c) => c._id === u._id))
              ?.map((user) => ({ ...user, isSaved: false })) || [];

          const mergedUsers = [...savedContacts, ...recentChats].filter(
            (user) => user._id !== authUser._id
          );

          set({ users: mergedUsers });
        } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to fetch users");
        } finally {
          set({ isUsersLoading: false });
        }
      },

      // ------------------- MESSAGES -------------------
      getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          set({ messages: Array.isArray(res.data) ? res.data : [] });
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to fetch messages"
          );
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      // ------------------- SEND MESSAGE -------------------
      sendMessage: async (messageData) => {
        const { selectedUser, replyTo, setReplyTo } = get();
        if (!selectedUser?._id) return;

        try {
          set({ isSending: true });
          const payload = {
            ...messageData,
            replyTo: replyTo ? replyTo._id : null,
          };

          const res = await axiosInstance.post(
            `/messages/send/${selectedUser._id}`,
            payload
          );

          // ✅ clear reply
          setReplyTo(null);
          set({ isSending: false });

          // ✅ append new message locally (only if unique)
          if (res?.data) {
            set((state) => {
              const exists = state.messages.some(
                (m) =>
                  m._id === res.data._id ||
                  (m.senderId === res.data.senderId &&
                    m.content === res.data.content &&
                    Math.abs(
                      new Date(m.createdAt) - new Date(res.data.createdAt)
                    ) < 2000)
              );
              if (exists) return state;
              return { messages: [...state.messages, res.data] };
            });
          }
        } catch (error) {
          console.error(error);
          set({ isSending: false });
          toast.error(
            error.response?.data?.message || "Failed to send message"
          );
        }
      },

      // ------------------- MULTI DELETE -------------------
      deleteSelectedMessages: async () => {
        const {
          selectedMessages,
          selectedUser,
          messages,
          setSelectedMessages,
        } = get();
        if (!Array.isArray(selectedMessages) || selectedMessages.length === 0)
          return;

        try {
          await Promise.all(
            selectedMessages.map((msgId) =>
              axiosInstance.delete(`/messages/${msgId}/for-me`)
            )
          );

          set({
            messages: messages.filter((m) => !selectedMessages.includes(m._id)),
            selectedMessages: [],
            isSelectMode: false,
          });

          toast.success("Messages deleted successfully");
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete messages");
        }
      },

      // ------------------- SOCKET LISTENERS -------------------
      subscribeToMessages: () => {
        const { socket, authUser } = useAuthStore.getState();
        if (!socket) return;

        socket.off("newMessage");
        socket.off("messageDeletedForMe");
        socket.off("messageDeletedForEveryone");
        socket.off("userTyping");
        socket.off("userStopTyping");
        socket.off("messageStatusUpdated");
        socket.off("messagesSeen");

        // ✅ New message arrived (duplicate guard added)
        socket.on("newMessage", (newMessage) => {
          const { selectedUser, messages } = get();
          const safeMessages = Array.isArray(messages) ? messages : [];

          // 🚫 Prevent duplicates (for offline or delay cases)
          const isDuplicate = safeMessages.some(
            (m) =>
              m._id === newMessage._id ||
              (m.senderId === newMessage.senderId &&
                m.content === newMessage.content &&
                Math.abs(
                  new Date(m.createdAt) - new Date(newMessage.createdAt)
                ) < 2000)
          );
          if (isDuplicate) return;

          // ✅ Add message if it's relevant to selected user
          if (
            selectedUser &&
            (newMessage.senderId === selectedUser._id ||
              newMessage.receiverId === selectedUser._id)
          ) {
            set({ messages: [...safeMessages, newMessage] });

            // Mark delivered if received
            if (authUser && newMessage.receiverId === authUser._id) {
              socket.emit("messageDelivered", { messageId: newMessage._id });
            }
          }
        });

        // message deleted for me
        socket.on("messageDeletedForMe", (deletedMessageId) => {
          const { messages } = get();
          const safeMessages = Array.isArray(messages) ? messages : [];
          set({
            messages: safeMessages.filter((m) => m._id !== deletedMessageId),
          });
        });

        // message deleted for everyone
        socket.on("messageDeletedForEveryone", (deletedMessage) => {
          const { messages } = get();
          const safeMessages = Array.isArray(messages) ? messages : [];
          set({
            messages: safeMessages.map((m) =>
              m._id === deletedMessage._id
                ? {
                    ...m,
                    text: "This message was deleted",
                    isDeletedForEveryone: true,
                  }
                : m
            ),
          });
        });

        // typing indicators
        socket.on("userTyping", ({ userId }) => {
          const { selectedUser } = get();
          if (selectedUser?._id === userId) set({ isTyping: true });
        });

        socket.on("userStopTyping", ({ userId }) => {
          const { selectedUser } = get();
          if (selectedUser?._id === userId) set({ isTyping: false });
        });

        // message status updated (delivered/seen)
        socket.on("messageStatusUpdated", ({ messageId, status }) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg._id === messageId ? { ...msg, status } : msg
            ),
          }));
        });

        // bulk seen notification
        socket.on("messagesSeen", ({ messageIds }) => {
          set((state) => ({
            messages: state.messages.map((msg) =>
              messageIds && messageIds.includes(msg._id)
                ? { ...msg, status: "seen" }
                : msg
            ),
          }));
        });
      },

      // ------------------- UNSUBSCRIBE -------------------
      unsubscribeFromMessages: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        socket.off("newMessage");
        socket.off("messageDeletedForMe");
        socket.off("messageDeletedForEveryone");
        socket.off("userTyping");
        socket.off("userStopTyping");
        socket.off("messageStatusUpdated");
        socket.off("messagesSeen");
      },

      // ------------------- TYPING EVENTS -------------------
      sendTyping: (receiverId) => {
        const { socket } = useAuthStore.getState();
        if (socket && receiverId) socket.emit("typing", { to: receiverId });
      },

      sendStopTyping: (receiverId) => {
        const { socket } = useAuthStore.getState();
        if (socket && receiverId) socket.emit("stopTyping", { to: receiverId });
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        selectedUser: state.selectedUser,
      }),
    }
  )
);
