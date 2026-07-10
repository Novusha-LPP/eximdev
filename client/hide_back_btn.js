import fs from 'fs';
const file = '/home/aiserver/eximdev/client/src/components/open-points/KarmaPointsModule.js';
let content = fs.readFileSync(file, 'utf8');

const target = `<Button 
                                type="text" 
                                icon={<ArrowLeftOutlined />} 
                                onClick={() => setSelectedTeam(null)}
                                style={{ padding: '4px 8px' }}
                            >
                                Back
                            </Button>`;
                            
const replacement = `{teamData.length > 1 && (
                                <Button 
                                    type="text" 
                                    icon={<ArrowLeftOutlined />} 
                                    onClick={() => setSelectedTeam(null)}
                                    style={{ padding: '4px 8px' }}
                                >
                                    Back
                                </Button>
                            )}`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log("Hid back button for HODs successfully!");
