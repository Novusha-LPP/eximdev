import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  Avatar,
  Typography,
  message,
  Spin,
  Transfer,
  Space,
  Descriptions,
  Empty
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import axios from "axios";
import PropTypes from "prop-types";
import { YearContext } from "../../../contexts/yearContext.js";
import { UserContext } from "../../../contexts/UserContext.js";

const { Title, Text } = Typography;

function UserDetails({ selectedUser, onClose, onSave }) {
  const [userData, setUserData] = useState(null);
  const [targetKeys, setTargetKeys] = useState([]); // Assigned importers
  const [dataSource, setDataSource] = useState([]); // All importers in Transfer format
  const [loading, setLoading] = useState(false);
  const { selectedYearState } = useContext(YearContext);
  const { user: currentUser } = useContext(UserContext);

  // Fetch all importers and user data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch Importer List
        let allImporters = [];
        if (selectedYearState) {
          try {
            const res = await axios.get(
              `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
            );
            let importerNames = res.data.map((item) => item.importer || item.name || item);

            // Filter if current user is not Admin
            if (currentUser && currentUser.role !== 'Admin') {
              const assigned = currentUser.assigned_importer_name || [];
              importerNames = importerNames.filter(name => assigned.includes(name));
            }
            allImporters = importerNames.sort();
          } catch (error) {
            console.error("Error fetching importers:", error);
          }
        }

        // 2. Fetch User Data (or use passed object if fully populated, but safer to fetch fresh)
        let fetchedUser = null;
        let userId = null;

        if (typeof selectedUser === "string") {
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user/${selectedUser}`);
          fetchedUser = res.data;
          userId = fetchedUser._id;
        } else if (selectedUser && selectedUser._id) {
          // If selectedUser is an object, we might still want to refresh it or use it directly
          // Let's rely on what's passed but ensure we have the latest assigned importers
          // The original code tried to be smart about this. Let's fetch to be safe and consistent.
          try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user/${selectedUser.username}`);
            fetchedUser = res.data;
            userId = fetchedUser._id;
          } catch (e) {
            fetchedUser = selectedUser;
            userId = selectedUser._id;
          }
        }

        if (fetchedUser) {
          setUserData(fetchedUser);
          const assignedImporters = fetchedUser.assigned_importer_name || [];
          setTargetKeys(assignedImporters);

          // Prepare Transfer DataSource
          // We need ALL possible importers that can be assigned.
          // This is 'Available Importers' (allImporters) UNION 'Assigned Importers' (to ensure no data loss if year filter excludes some)

          const uniqueImporters = Array.from(new Set([...allImporters, ...assignedImporters]));

          const transData = uniqueImporters.map(imp => ({
            key: imp,
            title: imp,
          }));
          setDataSource(transData);
        }

      } catch (error) {
        console.error("Error fetching details:", error);
        message.error("Failed to load user details");
      } finally {
        setLoading(false);
      }
    }

    if (selectedUser) {
      fetchData();
    }
  }, [selectedUser, selectedYearState, currentUser]);

  const onChange = async (nextTargetKeys, direction, moveKeys) => {
    // Optimistic update
    setTargetKeys(nextTargetKeys);
    setLoading(true);

    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/users/${userData?._id}/importers`,
        { importers: nextTargetKeys }
      );

      message.success("Importers updated successfully");

      if (onSave) {
        onSave(nextTargetKeys);
      }
    } catch (error) {
      console.error("Error saving importers:", error);
      message.error("Failed to save changes");
      // Could revert state here
    } finally {
      setLoading(false);
    }
  };

  const filterOption = (inputValue, option) =>
    option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1;

  if (!userData && !loading) return <Empty description="No user details found" />;

  return (
    <div style={{ padding: 20 }}>
      {userData && (
        <Card bordered={false} style={{ marginBottom: 24 }}>
          <Space align="center" style={{ marginBottom: 24 }}>
            <Avatar
              size={64}
              src={userData.employee_photo}
              icon={<UserOutlined />}
            />
            <div>
              <Title level={4} style={{ margin: 0 }}>{userData.username}</Title>
              <Text type="secondary">{userData.role}</Text>
            </div>
          </Space>

          <Text strong style={{ display: 'block', marginBottom: 16 }}>Assign Importers</Text>

          <Spin spinning={loading}>
            <Transfer
              dataSource={dataSource}
              showSearch
              filterOption={filterOption}
              targetKeys={targetKeys}
              onChange={onChange}
              render={item => item.title}
              listStyle={{
                width: '45%',
                height: 400,
              }}
              titles={['Available', 'Assigned']}
            />
          </Spin>
        </Card>
      )}
    </div>
  );
}

UserDetails.propTypes = {
  selectedUser: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  onClose: PropTypes.func, // Not used heavily as this is likely in a modal now, but kept for compat
  onSave: PropTypes.func,
};

export default UserDetails;