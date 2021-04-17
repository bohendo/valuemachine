import React, { useEffect } from "react";
import axios from "axios";

export const Taxes = ({
  profile,
}: {
  profile: any;
}) => {

  // Download all Transactions for the given profile
  useEffect(() => {
    if (!profile) return;
    axios.get("/api/auth").then((res) => {
      console.log(`Successfully authed for taxes`, res);
    });
  }, [profile]);

  return (
    <p>Welcome to the Taxes Page</p>
  );
};
