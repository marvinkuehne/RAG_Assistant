import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export function useUserId(): string {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let storedId = sessionStorage.getItem("user_id");
    if (!storedId) {
      storedId = uuidv4(); // generate a random ID once per user session
      sessionStorage.setItem("user_id", storedId);
    }
    setUserId(storedId);
  }, []);

  return userId;
}