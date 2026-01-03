// Feature Deprecated
// import UserProjectDetails from "./AssignRole/UserProjectDetails";
import PropTypes from "prop-types";

function AssignProjects({ selectedUser }) {
    // if (!selectedUser) return null;
    // return <UserProjectDetails selectedUser={selectedUser} onClose={() => { }} />;
    return <div style={{ padding: 20 }}>This feature is deprecated. Please manage project members directly in the Project Workspace.</div>;
}

AssignProjects.propTypes = {
    selectedUser: PropTypes.string,
};

export default AssignProjects;
