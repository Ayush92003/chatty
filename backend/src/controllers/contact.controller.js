import User from "../models/user.model.js";

//  Add Contact
export const addContact = async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = req.user._id;

    // Find friend by email
    const friend = await User.findOne({ email });
    if (!friend) return res.status(404).json({ message: "User not found" });

    if (friend._id.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const user = await User.findById(userId);

    // Check duplicate
    const alreadyAdded = user.contacts.some(
      (c) => c.user.toString() === friend._id.toString()
    );
    if (alreadyAdded)
      return res.status(400).json({ message: "Contact already exists" });

    // Add contact
    user.contacts.push({
      user: friend._id,
      displayName: name || friend.fullName,
      isSaved:true,
    });

    await user.save();

    res.status(200).json({ message: "Contact added successfully" });
  } catch (err) {
    console.error("Add Contact Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Contacts
export const getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "contacts.user",
      "fullName email profilePic"
    );

    const formattedContacts = user.contacts.map((c) => ({
      _id: c.user._id,
      fullName: c.displayName || c.user.fullName,
      email: c.user.email,
      profilePic: c.user.profilePic,
      isSaved: true,
    }));

    res.status(200).json(formattedContacts);
  } catch (err) {
    console.error("Get Contacts Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
