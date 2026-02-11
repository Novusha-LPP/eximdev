
import React, { useState, useEffect, useContext } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    Avatar,
    Typography,
    Button,
    Snackbar,
    Alert,
    Grid,
    List,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Divider,
} from "@mui/material";
import axios from "axios";
import PropTypes from "prop-types";

function not(a, b) {
    return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
    return a.filter((value) => b.indexOf(value) !== -1);
}

function union(a, b) {
    return [...a, ...not(b, a)];
}

function UserProjectDetails({ selectedUser, onClose, onSave }) {
    const [userData, setUserData] = useState(null);
    const [checked, setChecked] = useState([]);
    const [right, setRight] = useState([]); // Assigned projects
    const [left, setLeft] = useState([]); // Available projects
    const [allProjects, setAllProjects] = useState([]);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        type: "",
    });
    const [loading, setLoading] = useState(false);

    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);

    // Fetch all available projects
    useEffect(() => {
        async function getAllProjects() {
            try {
                const res = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/open-points/all-project-names`
                );
                setAllProjects(res.data.sort());
            } catch (error) {
                console.error("Error fetching all projects", error);
                setAllProjects([]);
            }
        }
        getAllProjects();
    }, []);

    // Fetch user data and assigned projects
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // Fetch User Basic Info
                const userRes = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`
                );
                setUserData(userRes.data);

                // Fetch Assigned Projects
                const projectsRes = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/open-points/user/${selectedUser}/assigned-projects`
                );
                const assignedProjects = projectsRes.data || [];

                setRight(assignedProjects.sort());

                // Set available projects (left side)
                const availableProjects = allProjects.filter(
                    (p) => !assignedProjects.includes(p)
                );
                setLeft(availableProjects.sort());

            } catch (error) {
                console.error("Error fetching user data:", error);
                setSnackbar({
                    open: true,
                    message: "Error fetching user information",
                    type: "error",
                });
            } finally {
                setLoading(false);
            }
        };

        if (selectedUser && allProjects.length > 0) {
            fetchUserData();
        }
    }, [selectedUser, allProjects]);

    const handleToggle = (value) => () => {
        const currentIndex = checked.indexOf(value);
        const newChecked = [...checked];

        if (currentIndex === -1) {
            newChecked.push(value);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        setChecked(newChecked);
    };

    const numberOfChecked = (items) => intersection(checked, items)?.length;

    const handleToggleAll = (items) => () => {
        if (numberOfChecked(items) === items.length) {
            setChecked(not(checked, items));
        } else {
            setChecked(union(checked, items));
        }
    };

    const saveProjects = async (newRight) => {
        setLoading(true);
        try {
            await axios.post(
                `${process.env.REACT_APP_API_STRING}/open-points/user/${selectedUser}/assign-projects`,
                { projectNames: newRight }
            );
            if (onSave) {
                onSave(newRight);
            }
            setSnackbar({
                open: true,
                message: "Projects assigned successfully.",
                type: "success",
            });
            // Close after short delay
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error(error);
            setSnackbar({
                open: true,
                message: "Failed to assign projects. Please try again.",
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAssignProject = async () => {
        const newRight = right.concat(leftChecked).sort();
        const newLeft = not(left, leftChecked).sort();
        setRight(newRight);
        setLeft(newLeft);
        setChecked(not(checked, leftChecked));
        await saveProjects(newRight);
    };

    const handleUnassignProject = async () => {
        const newLeft = left.concat(rightChecked).sort();
        const newRight = not(right, rightChecked).sort();
        setLeft(newLeft);
        setRight(newRight);
        setChecked(not(checked, rightChecked));
        await saveProjects(newRight);
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === "clickaway") return;
        setSnackbar({ open: false, message: "", type: "" });
    };

    const customList = (title, items) => (
        <Card>
            <CardHeader
                sx={{ px: 2 }}
                avatar={
                    <Checkbox
                        onClick={handleToggleAll(items)}
                        checked={
                            numberOfChecked(items) === items?.length && items?.length !== 0
                        }
                        indeterminate={
                            numberOfChecked(items) !== items?.length &&
                            numberOfChecked(items) !== 0
                        }
                        disabled={items?.length === 0}
                        inputProps={{
                            "aria-label": "all items selected",
                        }}
                    />
                }
                title={title}
                subheader={`${numberOfChecked(items)}/${items?.length} selected`}
            />
            <Divider />
            <List
                sx={{
                    width: 400,
                    height: 500,
                    bgcolor: "background.paper",
                    overflow: "auto",
                }}
                dense
                component="div"
                role="list"
            >
                {items?.map((value) => {
                    const labelId = `transfer-list-all-item-${value}-label`;

                    return (
                        <ListItemButton
                            key={value}
                            role="listitem"
                            onClick={handleToggle(value)}
                        >
                            <ListItemIcon>
                                <Checkbox
                                    checked={checked.indexOf(value) !== -1}
                                    tabIndex={-1}
                                    disableRipple
                                    inputProps={{
                                        "aria-labelledby": labelId,
                                    }}
                                />
                            </ListItemIcon>
                            <ListItemText id={labelId} primary={value} />
                        </ListItemButton>
                    );
                })}
            </List>
        </Card>
    );

    return (
        <div style={{ padding: "20px", margin: "20px auto", maxWidth: "1000px" }}>
            {/* User Information Header */}
            <Card style={{ marginBottom: "20px" }}>
                <CardContent>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <Avatar
                            src={userData?.employee_photo || "/default-avatar.png"}
                            alt={userData?.username}
                            style={{ width: "80px", height: "80px" }}
                        />
                        <div>
                            <Typography variant="h5" gutterBottom>
                                {userData?.username}
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                                Role: {userData?.role}
                            </Typography>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transfer List Interface */}
            <Grid container spacing={2} justifyContent="center" alignItems="center">
                <Grid item>{customList("Available Projects", left)}</Grid>
                <Grid item>
                    <Grid container direction="column" alignItems="center">
                        <Button
                            sx={{ my: 0.5 }}
                            variant="outlined"
                            size="small"
                            onClick={handleAssignProject}
                            disabled={leftChecked?.length === 0 || loading}
                            aria-label="move selected right"
                        >
                            &gt;
                        </Button>
                        <Button
                            sx={{ my: 0.5 }}
                            variant="outlined"
                            size="small"
                            onClick={handleUnassignProject}
                            disabled={rightChecked?.length === 0 || loading}
                            aria-label="move selected left"
                        >
                            &lt;
                        </Button>
                    </Grid>
                </Grid>
                <Grid item>{customList("Assigned Projects", right)}</Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.type}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}

UserProjectDetails.propTypes = {
    selectedUser: PropTypes.string,
    onClose: PropTypes.func,
    onSave: PropTypes.func,
};

export default UserProjectDetails;
