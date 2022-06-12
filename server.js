const express = require('express')
const app = express()
const bcrypt=require('bcrypt')
const generateAccessToken = require("./generateAccessToken")

const mysql = require('mysql')

require("dotenv").config()

app.use(express.json())


const db = mysql.createPool({
  connectionLimit: 100,
  socketPath : '/cloudsql/bangkit-352714:us-central1:user-database',
  user  : 'root',
  password  : '',
  database  : 'userDB'
})

const port = process.env.PORT || 8080;
app.listen(port,()=> console.log( `Server started on port ${port}`))
// db.getConnection((err,connection)=>{
//   if(err) throw(err)
//   console.log('DB connected successfull: ' + connection.threadId);
// })

app.get('/users', (req,res)=>{
  res.json(users) 
})

app.post('/createUser', async(req,res)=>{

  const user = req.body.name;
  const hashedPassword = await bcrypt.hash(req.body.password,10)

  db.getConnection(async (err,connection)=>{
    if(err) throw (err)
    const sqlSearch ="SELECT * FROM userTable WHERE user = ?"
    const search_query= mysql.format(sqlSearch,[user])

    const sqlInsert= "INSERT INTO userTable VALUES (0,?,?)"
    const insert_query= mysql.format(sqlInsert,[user,hashedPassword])

    await connection.query (search_query,async (err,result)=>{
      if(err)throw (err)
      console.log("------> Search Results");
      console.log("result.length");

      if(result.length != 0){
        connection.release()
        console.log("------> User already exists");
        res.status(409)
      }
      else{
        await connection.query (insert_query,(err,result)=>{
          connection.release()

          if(err)throw(err)

          console.log("------> Created New User");
          console.log("result.insertId");
          res.status(201)
        })
      }
    })
  })
})
app.post('/users', async (req,res)=>{
try{
  const salt = await bcrypt.genSalt()
  const hashedPassword = await bcrypt.hash(req.body.password,10)
  const user = {name:req.body.name, password: hashedPassword}
  users.push(user)
  res.status(201).send()
}catch{
  res.status(500)
}
})

app.post('/login',(req,res)=>{
  const user = req.body.name
  const password = req.body.password

  db.getConnection (async (err,connection)=>{
    
    if(err)throw(err)
    const sqlSearch="SELECT * from userTable WHERE user = ?"
    const search_query= mysql.format(sqlSearch,[user])

    await connection.query (search_query, async (err,result)=>{
      connection.release()

      if(err) throw(err)

      if(result.length == 0){
        console.log("------> User does not exist");
        res.status(404)
      }
      else{
        const hashedPassword = result[0].password

        if (await bcrypt.compare(password, hashedPassword)){
          console.log("------> Login Successful");
          console.log("------> Generating accessToken");
          const token = generateAccessToken({user:user})
          console.log(token);
          res.json({accessToken : token})
          res.send(`Halo, ${user}`)
        }
        else{
          res.send("Password incorrect!")
        }
      }
    })
  })
})