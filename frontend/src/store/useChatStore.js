import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [], 
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  setUsers: (users) => set({ users }),
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
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

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
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
      get().getUsers(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages } = get();

      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id ||
          newMessage.receiverId === selectedUser._id)
      ) {
        set({ messages: [...messages, newMessage] });
      }

      get().getUsers();
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
