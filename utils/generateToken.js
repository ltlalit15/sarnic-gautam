import jwt from "jsonwebtoken";

export const generatetoken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
};
