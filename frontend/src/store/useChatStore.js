/* eslint-disable no-unused-vars */
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedMessages: [], // ✅ Multi-select
  isSelectMode: false, // ✅ Multi-select mode
  isUsersLoading: false,
  isMessagesLoading: false,
  isSending: false,
  isTyping: false, // ✅ Typing indicator

  // ------------------- BASIC SETTERS -------------------
  setMessages: (messages) => set({ messages }),
  setUsers: (users) => set({ users }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  setSelectedMessages: (selectedMessages) => set({ selectedMessages }),
  setIsSelectMode: (mode) => set({ isSelectMode: mode }),

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
          .filter((u) => !savedContacts.find((c) => c._id === u._id))
          .map((user) => ({ ...user, isSaved: false })) || [];

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
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      set({ isSending: true });

      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );

      // ❌ Don't push manually, socket will update messages
      set({ isSending: false });

      get().getUsers?.();
    } catch (error) {
      console.error(error);
      set({ isSending: false });
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ------------------- SOCKET LISTENERS -------------------
  subscribeToMessages: () => {
    const { socket, authUser } = useAuthStore.getState();
    if (!socket) return;

    // Remove old listeners to avoid duplicates
    socket.off("newMessage");
    socket.off("messageDeletedForMe");
    socket.off("messageDeletedForEveryone");
    socket.off("userTyping");
    socket.off("userStopTyping");

    // 🔹 New message
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();
      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id ||
          newMessage.receiverId === selectedUser._id)
      ) {
        const exists = messages.some((m) => m._id === newMessage._id);
        if (!exists) set({ messages: [...messages, newMessage] });
      }
      get().getUsers();
    });

    // 🔹 Delete for Me
    socket.on("messageDeletedForMe", (deletedMessageId) => {
      const { messages } = get();
      set({
        messages: Array.isArray(messages)
          ? messages.filter((m) => m._id !== deletedMessageId)
          : [],
      });
    });

    // 🔹 Delete for Everyone
    socket.on("messageDeletedForEveryone", (deletedMessage) => {
      const { messages } = get();
      set({
        messages: Array.isArray(messages)
          ? messages.map((m) =>
              m._id === deletedMessage._id
                ? {
                    ...m,
                    text: "This message was deleted",
                    isDeletedForEveryone: true,
                  }
                : m
            )
          : [],
      });
    });

    // 🔹 Typing indicator
    socket.on("userTyping", ({ userId }) => {
      const { selectedUser } = get();
      if (selectedUser?._id === userId) set({ isTyping: true });
    });

    socket.on("userStopTyping", ({ userId }) => {
      const { selectedUser } = get();
      if (selectedUser?._id === userId) set({ isTyping: false });
    });
  },

  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeletedForMe");
    socket.off("messageDeletedForEveryone");
    socket.off("userTyping");
    socket.off("userStopTyping");
  },

  // ------------------- TYPING EVENTS -------------------
  sendTyping: (receiverId) => {
    const { socket } = useAuthStore.getState();
    if (socket) socket.emit("typing", receiverId);
  },

  sendStopTyping: (receiverId) => {
    const { socket } = useAuthStore.getState();
    if (socket) socket.emit("stopTyping", receiverId);
  },
}));
