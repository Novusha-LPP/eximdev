import zipfile
import xml.etree.ElementTree as ET
import sys

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            text = []
            for elem in root.iter():
                if elem.tag.endswith('}p'):
                    p_text = []
                    for t in elem.iter():
                        if t.tag.endswith('}t') and t.text:
                            p_text.append(t.text)
                    if p_text:
                        text.append("".join(p_text))
            
            return "\n".join(text)
    except Exception as e:
        return f"Error reading docx: {str(e)}"

if __name__ == "__main__":
    path = r"C:\Users\udayz\Downloads\CRM_CR_v2.docx"
    if len(sys.argv) > 1:
        path = sys.argv[1]
    
    content = get_docx_text(path)
    with open("crm_changes.txt", "w", encoding="utf-8") as f:
        f.write(content)
    print("Done writing to crm_changes.txt")
