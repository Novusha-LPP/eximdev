import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Card,
    Typography,
    Switch,
    message,
    Spin,
    Result,
    Descriptions
} from "antd";
import { RobotOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function AssignEximBot({ selectedUser }) {
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (selectedUser) {
            fetchUserStatus();
        }
    }, [selectedUser]);

    const fetchUserStatus = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/user-exim-bot-status/${selectedUser}`
            );
            setHasAccess(res.data.can_access_exim_bot);
        } catch (error) {
            console.error("Error fetching status:", error);
            message.error("Failed to fetch current status");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (checked) => {
        setToggling(true);
        // Optimistic update
        setHasAccess(checked);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_STRING}/assign-exim-bot`,
                {
                    username: selectedUser,
                    can_access_exim_bot: checked,
                }
            );
            message.success(res.data.message || "Access updated successfully");
        } catch (error) {
            console.error("Error updating status:", error);
            // Revert on error
            setHasAccess(!checked);
            message.error("Failed to update status");
        } finally {
            setToggling(false);
        }
    };

    if (!selectedUser) {
        return <Result icon={<RobotOutlined />} title="Please select a user to manage Exim Bot access" />;
    }

    return (
        <Card title="Manage Exim Bot Access" style={{ maxWidth: 800 }}>
            <Spin spinning={loading}>
                <Descriptions bordered column={1}>
                    <Descriptions.Item label="User">
                        <Text strong>{selectedUser}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Bot Access">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Switch
                                checked={hasAccess}
                                onChange={handleToggle}
                                loading={toggling}
                                checkedChildren="Access Granted"
                                unCheckedChildren="No Access"
                            />
                            <Text type="secondary">
                                {hasAccess
                                    ? "User allowed to use Exim Bot automation features."
                                    : "User cannot access Exim Bot."}
                            </Text>
                        </div>
                    </Descriptions.Item>
                </Descriptions>
            </Spin>
        </Card>
    );
}

export default AssignEximBot;
