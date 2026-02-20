import React, { useState, useEffect } from "react";
import { Card, Avatar, Typography, message, Spin, Transfer, Space, Empty } from "antd";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import PropTypes from "prop-types";

const { Title, Text } = Typography;

function AssignBranches({ selectedUser }) {
    const [userData, setUserData] = useState(null);
    const [targetKeys, setTargetKeys] = useState([]); // Assigned branch IDs
    const [dataSource, setDataSource] = useState([]); // All branches
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!selectedUser) return;
            setLoading(true);
            try {
                // 1. Fetch All Branches
                const branchesRes = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/branches`);
                const allBranches = branchesRes.data.data || [];

                const transData = allBranches.map((branch) => ({
                    key: branch._id,
                    title: `${branch.branch_name} (${branch.categories.join(", ")})`,
                }));
                setDataSource(transData);

                // 2. Fetch User Data to get assigned branches
                let username = typeof selectedUser === "string" ? selectedUser : selectedUser.username;
                const userRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user/${username}`);
                const fetchedUser = userRes.data;

                setUserData(fetchedUser);

                // assigned_branches could be populated objects or IDs. 
                // We ensure we map to IDs for targetKeys
                const assignedIds = (fetchedUser.assigned_branches || []).map((b) => b._id || b);
                setTargetKeys(assignedIds);

            } catch (error) {
                console.error("Error fetching branch assignment details:", error);
                message.error("Failed to load details for branch assignment");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedUser]);

    const onChange = async (nextTargetKeys) => {
        setTargetKeys(nextTargetKeys);
        setLoading(true);
        try {
            const username = userData.username;
            await axios.patch(
                `${process.env.REACT_APP_API_STRING}/users/${username}/assign-branches`,
                { branches: nextTargetKeys }
            );
            message.success("Branches updated successfully");

        } catch (error) {
            console.error("Error saving branches:", error);
            message.error("Failed to save branch assignments");
        } finally {
            setLoading(false);
        }
    };

    const filterOption = (inputValue, option) =>
        (option.title || "").toLowerCase().indexOf((inputValue || "").toLowerCase()) > -1;

    if (!selectedUser) return <Empty description="Please select a user to assign branches" />;
    if (!userData && !loading) return <Empty description="No user details found" />;

    return (
        <div style={{ padding: 20 }}>
            {userData && (
                <Card bordered={false} style={{ marginBottom: 24 }}>
                    <Space align="center" style={{ marginBottom: 24 }}>
                        <Avatar size={64} src={userData.employee_photo} icon={<UserOutlined />} />
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{userData.username}</Title>
                            <Text type="secondary">{userData.role}</Text>
                        </div>
                    </Space>

                    <Text strong style={{ display: "block", marginBottom: 16 }}>Assign Branches</Text>

                    <Spin spinning={loading}>
                        <Transfer
                            dataSource={dataSource}
                            showSearch
                            filterOption={filterOption}
                            targetKeys={targetKeys}
                            onChange={onChange}
                            render={(item) => item.title}
                            listStyle={{ width: "45%", height: 350 }}
                            titles={["Available Branches", "Assigned"]}
                        />
                    </Spin>
                </Card>
            )}
        </div>
    );
}

AssignBranches.propTypes = {
    selectedUser: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

export default AssignBranches;
