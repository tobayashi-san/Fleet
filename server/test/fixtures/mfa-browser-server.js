'use strict';
// Local browser acceptance harness: synthetic account, temporary database, auth routes only.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'shipyard-mfa-browser-'));
process.env.DB_PATH=path.join(root,'test.db');process.env.NODE_ENV='test';process.env.JWT_SECRET='synthetic-browser-only';process.env.SHIPYARD_MFA_POLICY='all';
const express=require('express'),bcrypt=require('bcryptjs'),db=require('../../db');
db.users.create('review.mfa','',bcrypt.hashSync('Synthetic-browser-password',4),'admin');
const app=express();app.use(express.json());app.use('/api/auth',require('../../routes/auth').router);
app.get('/api/acceptance',require('../../middleware/auth'),(req,res)=>res.json({username:req.user.username,mfa:req.authPayload.mfa===true}));
const server=app.listen(5190,'127.0.0.1',()=>console.log('Synthetic MFA API on 127.0.0.1:5190'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>{db.db.close();fs.rmSync(root,{recursive:true,force:true});process.exit(0);});});
