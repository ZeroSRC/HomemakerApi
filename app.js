// ทำ api ด้วย express js

const express = require('express')
require('dotenv').config();
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser');
/* เอาไว้ดึงค่าJSON ระหว่าง body */
const jsonParser = bodyParser.json();
// เชื่อมฐานข้อมูลกับ mysql2
const mysql = require('mysql2');

// เข้ารหัส password ด้วย brcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;
// ทำ Token สำหรับ login ด้วย Jsonwebtoken
const jwt = require('jsonwebtoken');
const secret = "data-secret";
const connection = mysql.createConnection({
  host: 'aws.connect.psdb.cloud',
  user: 'xyhom6qt51962lmtc64y',
  password: 'pscale_pw_6Vc97hFvnBDrnXedxA3v09ACIIv3p5GuHmD9HLaoRNm',
  database: 'homemaker',
  port: 3306, // MySQL default port
  ssl: {
    rejectUnauthorized: true
  }
});
app.use(cors())

app.get('/services', function (req, res, next) {
  connection.query('SELECT * FROM service WHERE serviceID',
    function (err, results) {
      res.json(results);
      if (err) {
        res.json(err.message);
      }
    }
  )
})
app.get('/users/:id', function (req, res, next) {
  const name = req.params.id;
  connection.query('SELECT * FROM users WHERE users.username = ?', [name],
    function (err, results) {
      if (results.length === 0) {
        res.json({
          "userID": null,
          "fname": null,
          "lname": null,
          "phone": null,
          "name": null,
          "username": null,
          "password": null,
          "address": null,
          "road": null,
          "tumbon": null,
          "umphor": null,
          "province": null,
          "postcode": null
        });
        // console.log(results)
      } else {
        res.json(results);
      }
      if (err) {
        res.json(err.message);
      }
    }
  )
})
app.get('/workers/:username', function (req, res, next) {
  const username = req.params.username;
  connection.query('SELECT * FROM workers WHERE username = ?', [username], function (err, results) {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } else {
      if (results.length > 0) {
        const workerData = results[0]; // ต้องมีผลลัพธ์เพียงรายการเดียว
        res.status(200).json(workerData);
      } else {
        res.status(404).json({ error: 'ไม่พบข้อมูล worker' });
      }
    }
  });
});

app.post('/login', jsonParser, function (req, res, next) {
  const username = req.body.username;
  connection.query('SELECT * FROM users WHERE users.username = ?', [username], function (err, userResults) {
    if (err) {
      res.json(err.message);
      return;
    }
    connection.query('SELECT * FROM workers WHERE workers.username = ?', [username], function (err, workerResults) {
      if (err) {
        res.json(err.message);
        return;
      }
      if (userResults.length > 0 || workerResults.length > 0) {
        const users = userResults.length > 0 ? userResults : workerResults;
        const role = userResults.length > 0 ? 'users' : 'workers';
        bcrypt.compare(req.body.password, users[0].password, function (err, isLogin) {
          if (isLogin) {
            const token = jwt.sign({ username: users[0].username }, secret, { expiresIn: '1h' })
            res.json({ status: "success", message: "Login successful", token: token, role: role });
          } else {
            res.json({ status: "error", message: "Invalid password" });
          }
        });
      } else {
        res.json({ msg: "Username not found in the system" });
      }
    });
  });
});
app.post('/register', jsonParser, function (req, res, next) {
  const name = req.body.username;
  connection.query('SELECT * FROM users WHERE users.username = ?', [name], function (err, userResults) {
    if (err) {
      res.json(err.message);
      return;
    }
    connection.query('SELECT * FROM workers WHERE workers.username = ?', [name], function (err, workerResults) {
      if (err) {
        res.json(err.message);
        return;
      }
      if (userResults.length > 0 || workerResults.length > 0) {
        res.json({ status: "userfull" });
      } else {
        const role = req.body.role;
        if (role === "user") {
          bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            connection.execute(
              'INSERT INTO users(`fname`, `lname`, `phone`, `name`, `username`, `password`,`address`,`road`,`tumbon`,`umphor`,`province`,`postcode`) VALUES(DEFAULT,DEFAULT,DEFAULT,?,?,?,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT)', [req.body.name, req.body.username, hash],
              function (err, result, fields) {
                if (err) {
                  res.json({ status: "error", message: err })
                  return;
                }
                res.json({ status: "success" })
              }
            );
          });
        }
        else if (role === "worker") {
          bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            connection.execute(
              'INSERT INTO workers(`fname`, `lname`, `phone`, `name`, `username`, `password`,`serviceID`,`address`,`road`,`tumbon`,`umphor`,`province`,`postcode`,`workposition`) VALUES(DEFAULT,DEFAULT,DEFAULT,?,?,?,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT,DEFAULT)', [req.body.name, req.body.username, hash],
              function (err, result, fields) {
                if (err) {
                  res.json({ status: "error", message: err })
                  return
                }
                res.json({ status: "success" })
              }
            );
          });
        } else {
          res.json({ status: "error role" })
        }
      }
    });
  });
});
app.post('/auth', jsonParser, function (req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1]
    const decoded = jwt.verify(token, secret);
    res.json({ status: "success", msg: "pass verify", decoded: decoded })
  } catch (err) {
    res.json({ status: "error", msg: "error verify" })
  }
});
// พาทสำหรับกดรับจา้งงาน
app.post('/users/:ID/booking', jsonParser, function (req, res, next) {
  const userID = req.params.ID; // คุณอาจต้องแก้ไขวิธีการดึง userID จาก request ตามที่คุณต้องการ
  const starttime = req.body.starttime; // เพิ่ม starttime จากข้อมูลการจอง
  const status = "จองบริการ";
  const serviceID = req.body.serviceID;
  const description = req.body.description;
  const totalprice = req.body.totalprice;
  const address = req.body.address;
  const road = req.body.road;
  const tumbon = req.body.tumbon;
  const umphor = req.body.umphor;
  const province = "พิษณุโลก";
  const postcode = req.body.postcode;
  const sql = `INSERT INTO booking (userID, starttime, status, serviceID, description, totalprice, address, road, tumbon, umphor, province, postcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  connection.query(sql, [userID, starttime, status, serviceID, description, totalprice, address, road, tumbon, umphor, province, postcode], (error, results) => {
    if (error) {
      console.error('มีข้อผิดพลาดในการเพิ่มการจอง:', error);
      res.status(500).json({ status: "error", error: 'มีข้อผิดพลาดในการเพิ่มการจอง' });
    } else {
      res.status(200).json({ status: "success", message: 'การจองเสร็จสมบูรณ์' });
    }
  });
});

app.post('/users/:ID/profile', jsonParser, function (req, res, next) {
  const userID = req.params.ID; // รับค่า ID ผ่าน URL
  const updateData = req.body; // รับข้อมูลที่ต้องการอัพเดตจาก request body
  // สร้างคำสั่ง SQL สำหรับอัพเดตข้อมูล
  const sql = `UPDATE users SET 
    fname = ${mysql.escape(updateData.fname)},
    lname = ${mysql.escape(updateData.lname)},
    phone = ${mysql.escape(updateData.phone)},
    name = ${mysql.escape(updateData.name)},
    address = ${mysql.escape(updateData.address)},
    road = ${mysql.escape(updateData.road)},
    tumbon = ${mysql.escape(updateData.tumbon)},
    umphor = ${mysql.escape(updateData.umphor)},
    province = ${mysql.escape(updateData.province)},
    postcode = ${mysql.escape(updateData.postcode)}
    WHERE userID = ${mysql.escape(userID)}`;
  // ทำการ execute คำสั่ง SQL ด้านบน
  connection.query(sql, function (error, results, fields) {
    if (error) {
      // กรณีเกิดข้อผิดพลาดในการอัพเดต
      console.error('เกิดข้อผิดพลาดในการอัพเดตข้อมูล:', error);
      res.status(500).send({ status: "error", msg:  'เกิดข้อผิดพลาดในการอัพเดตข้อมูล'});
    } else {
      // อัพเดตข้อมูลสำเร็จ
      res.status(200).send({ status: "success", msg: 'อัพเดตข้อมูลสำเร็จ' });
    }
  });
});
app.post('/workers/:ID/profile', jsonParser, function (req, res, next) {
  const workerID = req.params.ID; // รับค่า ID ผ่าน URL
  const updateData = req.body; // รับข้อมูลที่ต้องการอัพเดตจาก request body
  // สร้างคำสั่ง SQL สำหรับอัพเดตข้อมูล
  const sql = `UPDATE workers SET 
    fname = ${mysql.escape(updateData.fname)},
    lname = ${mysql.escape(updateData.lname)},
    phone = ${mysql.escape(updateData.phone)},
    name = ${mysql.escape(updateData.name)},
    address = ${mysql.escape(updateData.address)},
    road = ${mysql.escape(updateData.road)},
    tumbon = ${mysql.escape(updateData.tumbon)},
    umphor = ${mysql.escape(updateData.umphor)},
    province = ${mysql.escape(updateData.province)},
    postcode = ${mysql.escape(updateData.postcode)}
    WHERE workerID = ${mysql.escape(workerID)}`;
  // ทำการ execute คำสั่ง SQL ด้านบน
  connection.query(sql, function (error, results, fields) {
    if (error) {
      // กรณีเกิดข้อผิดพลาดในการอัพเดต
      console.error('เกิดข้อผิดพลาดในการอัพเดตข้อมูล:', error);
      res.status(500).send({ status: "error", msg:  'เกิดข้อผิดพลาดในการอัพเดตข้อมูล'});
    } else {
      // อัพเดตข้อมูลสำเร็จ
      res.status(200).send({ status: "success", msg: 'อัพเดตข้อมูลสำเร็จ' });
    }
  });
});
// พาทในการดึงประวัติของ users 
app.get('/users/:userid/history', function (req, res, next) {
  const userID = req.params.userid;
  const sql = `
    SELECT
      booking.*,
      workers.fname AS worker_fname,
      workers.lname AS worker_lname,
      workers.phone AS worker_phone,
      CONCAT_WS(', ', booking.address, 'ถนน' , booking.road, CONCAT('ตำบล', booking.tumbon), CONCAT('อำเภอ', booking.umphor), CONCAT('จังหวัด', booking.province), CONCAT('รหัสไปรษณีย์', booking.postcode)) AS full_address
    FROM booking
    LEFT JOIN workers ON booking.workerID = workers.workerID
    WHERE booking.userID = ?
  `;
  connection.query(sql, [userID], (error, results) => {
    if (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } else {
      // แปลงเวลาในผลลัพธ์ JSON เป็นวันที่ (Date)
      results.forEach(result => {
        if (result.starttime) {
          const startTime = new Date(result.starttime);
          const formattedStartDate = startTime.toLocaleDateString(); // แสดงเฉพาะวันที่
          result.starttime = formattedStartDate;
        }
        if (result.endtime) {
          const endTime = new Date(result.endtime);
          const formattedEndDate = endTime.toLocaleDateString(); // แสดงเฉพาะวันที่
          result.endtime = formattedEndDate;
        }
      });
      res.status(200).json(results);
    }
  });
})
app.post('/workers/:workerID/updateforwork', jsonParser,function (req, res, next) {
  const workerID = req.params.workerID;
  const workposition = req.body.workposition;
  const serviceID = req.body.serviceID;
  const sql = 'UPDATE workers SET workposition = ?, serviceID = ? WHERE workerID = ?';
  const values = [workposition, serviceID, workerID];
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    } else {
      res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ' });
    }
  });
});
// พาทสำหรับดึงบริการ
app.get('/worker/:workposition/:serviceID', function (req, res) {
  const workposition = req.params.workposition;
  const serviceID = req.params.serviceID;
  const sql = `
    SELECT booking.*, users.phone, users.fname, users.lname
    FROM booking
    JOIN users ON booking.userID = users.userID
    WHERE booking.status = 'จองบริการ'
    AND booking.serviceID = ?
    AND ? = booking.umphor
  `;

  connection.query(sql, [serviceID, workposition], function (err, results) {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } else {
      res.status(200).json(results);
    }
  });
});

// พาทสำหรับกดรับงาน
app.post('/worker/:id/workallpage', jsonParser, function (req, res, next) {
  const bookingID = req.body.bookingID; // ค่า bookingID ที่คุณต้องการอัปเดต
  const workerID = req.body.workerID; // ค่าใหม่ของ workerID ที่คุณต้องการอัปเดต
  const sql = `UPDATE booking SET workerID = ?, status = 'รับบริการแล้ว' WHERE bookingID = ?`;
  // ตัวอย่างการใช้คำสั่ง SQL และการส่งพารามิเตอร์
  connection.query(sql, [workerID, bookingID], (error, results) => {
    if (error) {
      console.error('มีข้อผิดพลาดในการอัปเดตข้อมูลงาน:', error);
      res.status(500).json({ error: 'มีข้อผิดพลาดในการอัปเดตข้อมูลงาน' });
    } else {
      res.status(200).json({ message: 'อัปเดตข้อมูลงานเสร็จสมบูรณ์' });
    }
  });
});
// ผู้ใช้สั่งจบงาน
app.post('/worker/:bookingID/update', jsonParser, function (req, res, next) {
  const bookingID = req.params.bookingID;
  const { status, endtime } = req.body;
  const sql = 'UPDATE booking SET status = ?, endtime = ? WHERE bookingID = ?';
  const values = [status, endtime, bookingID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    } else {
      res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ' });
    }
  });
});
// ดูงานที่ worker รับมาเเล้ว
app.get('/workers/recriev/:username', jsonParser,function (req, res, next) {
  const workerID = req.params.username;
  const sql = `
    SELECT booking.*, users.phone, users.fname, users.lname
    FROM booking
    JOIN users ON booking.userID = users.userID
    WHERE booking.workerID = ?
    AND booking.status = 'รับบริการแล้ว'
  `;
  connection.query(sql, [workerID], function (err, results) {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } else {
      res.status(200).json(results);
    }
  });
});
app.get('/workers/history/:username', jsonParser,function (req, res, next) {
  const workerID = req.params.username;
  const sql = `
    SELECT booking.*, users.phone, users.fname, users.lname
    FROM booking
    JOIN users ON booking.userID = users.userID
    WHERE booking.workerID = ?
  `;
  connection.query(sql, [workerID], function (err, results) {
    if (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    } else {
      res.status(200).json(results);
    }
  });
});
app.get('/', (req, res) => {
  res.send('Hello, world!');
});
// รันบน port
app.listen(process.env.PORT || 3333);