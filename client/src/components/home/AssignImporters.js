import React from "react";
import UserDetails from "./AssignRole/UserDetails";
import PropTypes from "prop-types";
import { Empty } from "antd";

function AssignImporters({ selectedUser, allowInactive = false }) {
  if (!selectedUser) return <Empty description="Please select a user to assign importers" />;

  return <UserDetails selectedUser={selectedUser} allowInactive={allowInactive} onClose={() => { }} />;
}

AssignImporters.propTypes = {
  selectedUser: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
};

export default AssignImporters;
