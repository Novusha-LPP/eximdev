import express from "express";
import { Resend } from "resend";

const router = express.Router();


router.post("/send", async (req,res)=>{

try{

const {
 apiKey,
 from,
 fromName,
 to,
 subject,
 message,
 replyTo

}=req.body;


console.log("SEND EMAIL BODY:", req.body);



if(!apiKey){

return res.status(400).json({
success:false,
message:"Resend API key missing"
});

}



if(!from){

return res.status(400).json({
success:false,
message:"From email missing"
});

}



if(!to){

return res.status(400).json({
success:false,
message:"To email missing"
});

}



const result = await sendEmail({

apiKey,

from:
`${fromName || "IT Helpdesk"} <${from}>`,

to,

subject,

text:message,

html:`<h3>${message}</h3>`,

replyTo

});



return res.json({

success:true,

message:"Email sent successfully",

data:result

});


}
catch(error){


console.log(
"EMAIL SEND ERROR:",
error
);



return res.status(500).json({

success:false,

message:error.message

});


}


});