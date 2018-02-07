require('webduino-js');
require('webduino-blockly');

var linebot = require('linebot');
var express = require('express');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var bot = linebot({
  channelId: '1552940206',
  channelSecret: '62e4fc6a62ef81aa559eb3a25ad43275',
  channelAccessToken: 'zI7eLUJ3FMOUVClhYjI8GoDhsyWrNLxB6r0NY7S97MpiWISC6e1RxIQybp0LbDnvCUt9uqU7Jj5gwqFgnJHbGY0bfYOrCMc9UX3eZVUEAhcdUuI66ai/i1I8p1fMyEO0yklI/6NupLaiUH8E+t5IbAdB04t89/1O/w1cDnyilFU='
});

//google與試算表權杖
var clientsecret={"installed":{"client_id":"479898043718-lup8n5jqu4966evfttbaqi54u8g0rk4c.apps.googleusercontent.com","project_id":"praxis-granite-191610","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://accounts.google.com/o/oauth2/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"Xw2vL6zIcBNxtKr8o381KQWo","redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]}}
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(clientsecret.installed.client_id,clientsecret.installed.client_secret, clientsecret.installed.redirect_uris[0]);
oauth2Client.credentials ={"access_token":"ya29.Gls9BQU9XIxCcwKmh8x1DNBFw7KtZUtnz5yWIzzdNkGlLIuVSHwavOwF1brXAauVGCY5CLB6_bI_hi6ceK7vGrLuHsUxU5AHjMCUcNS6U42xvMxMmHHOct6nV23A","refresh_token":"1/ClJ-30WGZ8vjXlkHGKxkDw6yzVnowbf2pseYf2iMrk8","token_type":"Bearer","expiry_date":1515497815494}

var SheetId='1knco-UIs-D8iX10zBba9sO0q0c-2uv5RdLIeFK-tBD0';//試算表id
var device_id_1={device: '8QwwV'}; //Webduino的device id
var device_id_2={device: '10Q28gDy', transport: 'mqtt'};
var Board_1;  
var Board_2;
var admin = 0 ;       //管理員
var people =0 ;      //家庭總人數
var line_id = [] ;  // LINE 身分列表 
var card_uid = [] ;//卡號列表
var user_id =[] ; //門禁卡身分列表   
var door = [] ;  //進or出門列表  
var card_add = '' ;        //新增卡號
var line_add = '' ;       //新增LINE使用者
var admin_1_2_3_4_5_6 = '' ;//暫存新增刪除總變數
var line_id_t = '' ;    //暫存line id 
var user_id_t = '' ;   //暫存身分位置
getdata(); 

//LineBot處理文字訊息
bot.on('message', function(event) {
  var bot_txt='';
  line_id_t = event.source.userId;
  if (event.message.type === 'text') {
    bot_txt=botText(event.message.text);
  }
  event.reply(bot_txt).then(function(data) {   
    console.log('訊息已傳送！');   // success 
  }).catch(function(error) {
    console.log('error');       // error 
  });
});
//LineBot處理選單訊息
bot.on('postback', function (event) {
  event.reply(botpostback(event.postback.data)).then(function(data) {   
    console.log('訊息已傳送！');   // success 
  }).catch(function(error) {
    console.log('error');       // error 
  });
});
//處理webduino開發版
boardReady(device_id_1, true, function (board) {
  Board_1=board;
  board.systemReset();
  board.samplingInterval = 250;
  relay_1 = getRelay(board, 7);
  relay_1.off();
  buzzer = getBuzzer(board, 2);  
  rfid = getRFID(board);
  rfid.read();     
  rfid.on("enter",function(_uid){
    rfid._uid = _uid;
    door_RFID(_uid);
  });  
});   
boardReady(device_id_2, true, function (board) {
  Board_2=board;
  board.systemReset();
  board.samplingInterval = 50;
  relay_2 = getRelay(board, 5);
  relay_2.off();
 /* g3 = getG3(board, 2,3);
 g3.read(function(evt){
 bot.push('U79964e56665caa1f44bb589160964c84',  '目前pm25:'  + g3.pm25 ); 
 }, 1000 * 5 ); */
}); 

const app = express();
const linebotParser = bot.parser();
app.post('/', linebotParser);
//express 預設走 port 3000，而 heroku 上預設卻不是，透過下列程式轉換
var server = app.listen(process.env.PORT || 8080, function() {
  var port = server.address().port;
  console.log("App now running on port", port);
});

//讀取試算表-資料庫
function getdata() {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: SheetId,
    range:encodeURI('資料庫'),  //試算表-工作表名稱
  }, function(err, response) {  
    var data = response.values;   // 讀取資料以二維陣列表示  [列][攔]
    if (err) {            
      console.log('讀取資料庫的API產生問題：' + err);
      return;
    }      
    else {    
      var f = (data.length);  
      line_id = data[f-7]    //0
      card_uid = data[f-6];  //1
      user_id =  data[f-5];  //2
      door = data[f-4];      //3     
      people = parseFloat(data[f-3][0]); //4,1
      console.log('資料庫已取得完畢！');
    } 
  });
} 
//上傳試算表-資料庫
function add_date() {
  var request = {
    auth: oauth2Client,
    spreadsheetId: SheetId,
    range:encodeURI('資料庫'),
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: 'RAW',
    resource: {
      "values": [ 
        line_id,     
        card_uid,      //第二列  [第一欄,第二欄,.... ]
        user_id,      //第三列  
        door,
        [people,'總人數'], 
        [new Date(),'時間'],
        ['--------------',],
      ]                         
    }
  };
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.append(request, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
  });
} 
//處理line訊息
function botText(message){
  var Result='';
  if (admin === 1234 && line_id_t === 'U79964e56665caa1f44bb589160964c84'){ Result = admin_door(message) }
  else { Result = webduino(message) } 
  if (Result!=''){}
  else if (message === '1234'){                                  
    if (line_id_t === 'U79964e56665caa1f44bb589160964c84' ){   
      admin = 1234 ;                                           
      Result= [{ type: 'template',
                  altText: 'this is a carousel template',
                  template: {
                    type: 'carousel', //選單旋轉
                    columns: [{ //最多10個
                      title: '身分管理',
                      text: '新增使用者將預設為在家中\n刪除使用者將刪除相關資料',
                      actions: [{//最多三個
                        type: 'postback',
                        label: '新增使用者',
                        data: '新增使用者' 
                      },{
                        type: 'postback',
                        label: '刪除使用者',
                        data: '刪除使用者' 
                      }]
                    }, {
                      title: 'LINE UID 管理',
                      text: '為使用者追加LINE控制 ，可以使用LINE來開門。\n1位LINE用戶僅能代表一位使用者',
                      actions:[{
                        type: 'postback',
                        label: '新增LINE UID',
                        data: '新增LINE UID' 
                      }, {
                        type: 'postback',
                        label: '刪除LINE UID',
                        data: '刪除LINE UID' 
                      }]
                    },{
                      title: '卡號管理',
                      text: '為使用者追加悠遊卡控制 ，可以使用悠遊卡感應來開門。\n1張悠遊卡僅能代表一位使用者',
                      actions:[{
                        type: 'postback',
                        label: '新增卡號',
                        data: '新增卡號' 
                      }, {
                        type: 'postback',
                        label: '刪除卡號',
                        data: '刪除卡號' 
                      }]
                    }]
                  }
                },{ type: 'text', text: '管理功能使用時間為90秒。'},{ type: 'text', text: '資料庫連結:https://goo.gl/PMx5q9'}]
      setTimeout(function () { 
        admin = 0 ;
        admin_1_2_3_4_5_6= '' ;        
        line_add = '';
        bot.push('U79964e56665caa1f44bb589160964c84', '管理權限啟動時間結束!'); 
      } , 1000 * 90);
    } 
    else{
      Result='您未具備管理身分，無法啟用!';  
    } 
  }
  else if (line_add === '新增' && message === '159'){
    var f = user_id.length;
    for (var k = 0 ; k<= f-2 ; k++){
      if (line_id[k] === line_id_t){
        bot.push('U79964e56665caa1f44bb589160964c84', '新增失敗，該用戶以代表一位使用者');
        Result = '您身分為:' + user_id[k] + '\n早就能用LINE來開門喔!'  ;
        line_add = '';
        break;
      }
    }
    if (line_add === '新增'){
      line_id[user_id_t] = line_id_t ;
      bot.push('U79964e56665caa1f44bb589160964c84', 'LINE UID新增成功!');
      Result = '已被新增\n可以使用LINE來開門囉!\n您身分為:' + user_id[user_id_t] ;
      add_date();
      line_add = '';
    }
  }   
  else if (message==='目前家中人數')	   
    Result='目前家中有' + people +'人'  ;   
  else{
    Result = '謝謝回覆!' ;
  } 
  return Result;
}
//處理選單訊息
function botpostback(message){
  var Result = '';
  if (message === '新增使用者' && admin === 1234 || message === '刪除使用者' && admin === 1234 || message === '新增LINE UID' && admin === 1234 || message === '刪除LINE UID' && admin === 1234 || message === '新增卡號' && admin === 1234 || message === '刪除卡號' && admin === 1234 ){
    Result = message + '\n請輸入使用者名稱!';
    if (message === '新增使用者'){
      admin_1_2_3_4_5_6= 1 ;
    }
    else if (message === '刪除使用者'){
      admin_1_2_3_4_5_6= 2 ;
    }
    else if (message === '新增LINE UID'){
      admin_1_2_3_4_5_6= 3 ;
    }
    else if (message === '刪除LINE UID'){
      admin_1_2_3_4_5_6= 4 ;
    }
    else if (message === '新增卡號'){
      admin_1_2_3_4_5_6= 5 ;
    }
    else if (message === '刪除卡號'){
      admin_1_2_3_4_5_6= 6 ;
    }
  }
  return Result;
} 
//處理管理功能
function admin_door(message){
  var Result = '';
  var f = (user_id.length);  
  if (admin_1_2_3_4_5_6=== 1  ){
    for (var j = 0 ; j <=f-2 ; j++){
      if (user_id[j] === message){
        Result = '此使用者已存在!';
        message ='' ;  
        break;
      }
    }
    if (message != ''){
      people = people + 1 ;
      user_id.splice(0,0,message);
      card_uid.splice(0,0,"");
      line_id.splice(0,0,"");
      door.splice(0,0,'在家中');
      Result = '"' + message + '"新增成功!';
      add_date();
    }
  }
  else if (admin_1_2_3_4_5_6=== 2 ){
    for (var j = 0; j <= f-2; j++) {
      if (user_id[j] === message ){           
        if (f === 2){
          Result= '只剩"' + user_id[0]  +'"，無法刪除!';
          message ='';
          break;
        }
        else {
          if (door[j] === '在家中' ){
            people = people - 1 ;         
          }
          line_id.splice(j, 1);
          card_uid.splice(j, 1);
          user_id.splice(j, 1);
          door.splice(j, 1);         
          Result= '"' + message + '"刪除成功!';                                    
        }
        message ='';
        add_date();
        break;
      }   
    }
    if (message != ''){
      Result= '沒有這位使用者! \n請檢查是否輸入錯誤';              
    }
  }    
  else if (admin_1_2_3_4_5_6=== 3){
    for (var j = 0; j <= f-2; j++) {
      if (user_id[j] === message  ){
        Result = '請讓要新增的LINE使用者傳送"159"訊息!';
        line_add = '新增' ;
        user_id_t = j ;
        message = '';
        break;
      }           
    }
    if (message != ''){
      Result = '沒有這位使用者! \n請檢查是否輸入錯誤';    
    }   
  }
  else if (admin_1_2_3_4_5_6=== 4){
    for (var j = 0; j <= f-2; j++) {
      if (user_id[j] === message  ){
        Result = 'LINE UID刪除成功!';
        line_id[j] = '' ;
        message = '';
        add_date();
        break;
      }           
    }
    if (message != ''){
      Result = '沒有這位使用者! \n請檢查是否輸入錯誤';    
    }
  }
  else if (admin_1_2_3_4_5_6=== 5){
    for (var j = 0; j <= f-2; j++) {
      if (user_id[j] === message  ){
        Result = '請感應要新增的門禁卡';
        card_add = '新增' ;
        user_id_t = j ;
        message = '';
        break;
      }           
    }
    if (message != ''){
      Result = '沒有這位使用者! \n請檢查是否輸入錯誤';    
    }
  }
  else if (admin_1_2_3_4_5_6=== 6){
    for (var j = 0; j <= f-2; j++) {
      if (user_id[j] === message  ){
        Result = '卡號刪除成功!';
        card_uid[j] = '' ;
        message = '';
        add_date();
        break;
      }           
    }
    if (message != ''){
      Result = '沒有這位使用者! \n請檢查是否輸入錯誤';    
    }
  }
  admin_1_2_3_4_5_6= '' ;
  return Result ;
}
//處理webduino腳位
function webduino(message){
  var Result='';  
  if (message==='開門'){    
    if (!deviceIsConnected())
      Result='裝置未連接！';
    else{
      Result = door_LINE(line_id_t);        
    }     
  }
  else if (message==='開燈'){    
    if (!deviceIsConnected2())
      Result='裝置未連接！';
    else{
      Result='電燈已開啟!';
      relay_2.on();		 	            
    }               			
  }
  else if (message==='關燈'){    
    if (!deviceIsConnected2())
      Result='裝置未連接！';
    else{
      Result='電燈已關閉!';
      relay_2.off();		 	            
    }     
  }    
  return Result;
}
//使用RFID開門
function door_RFID(UID){ 
  if (card_add ===  '新增' ){   
    var f = (card_uid.length);	  		  
    for (var j = 0; j <= f-2; j++) {
      if (card_uid[j] === UID  ){
        bot.push('U79964e56665caa1f44bb589160964c84', '新增失敗，該卡以代表一位使用者');	
        card_add = '' ;
        break;
      }				 
    }
    if (card_add === '新增'){	
      card_uid[user_id_t] = UID;
      bot.push('U79964e56665caa1f44bb589160964c84', '門禁卡新增成功!\n此卡代表身分為:' + user_id[user_id_t] );
      buzzer.play(buzzer_music([ {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );
      card_add = '';	
      add_date();
    }
  }		
  else{   
    var line_f = (line_id.length); 
    var f = (card_uid.length);	  		  
    for (var j = 0; j <= f-2; j++) {
      if (card_uid[j] === UID  ){
        if (door[j] === '在家中'){
        people = people -1 ;		 
        door[j] = '不在家';			 
          for (var t = 0 ; t<= f-2 ; t++){
            bot.push(line_id[t],'"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' );   
          }   
        }
        else if (door[j] === '不在家'){
          people = people + 1;  		 
          door[j] = '在家中';	           	
          for (var t = 0 ; t<= f-2 ; t++){
            bot.push(line_id[t],'"' + user_id[j]  +'" 回家，家裡人數:' + people  + '人在家' );   
          }							
        }
        add_date(); 	
        relay_1.on();
        setTimeout(function () {                   
          relay_1.off();
        }, 1000 * 3);
        UID  = '' ;
        break;
      }		
    }
    if (UID != ''){
      bot.push('U79964e56665caa1f44bb589160964c84','有外來人士感應\n卡號:' + UID);
      buzzer.play(buzzer_music([  {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );	 
    }
  } 
}
//使用LINE開門
function door_LINE(UID){  
  var text ;  
  var f = (line_id.length);         
  for (var j = 0; j <= f-2; j++) {
    if (line_id[j] === UID  ){
      if (door[j] === '在家中'){
        people = people -1 ;     
        door[j] = '不在家';   
        for (var t = 0 ; t<= f-2 ; t++){
          bot.push(line_id[t],'"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' );   
        }
      }
      else if (door[j] === '不在家'){
        people = people + 1;  
        door[j] = '在家中'; 
        for (var t = 0 ; t<= f-2 ; t++){
          bot.push(line_id[t],'"' + user_id[j]  +'" 回家，家裡人數:' + people  + '人在家' );  
        }                
      }
      add_date();   
      relay_1.on();
      setTimeout(function () {                   
        relay_1.off();
      }, 1000 * 3);
      UID  = '' ;
      break;
    }   
  }
  if (UID != ''){
    bot.push('U79964e56665caa1f44bb589160964c84','有外來人士加入\n此人line_UID:' + UID);
    bot.push(line_id_t,'不好意思!\n您非此家庭使用者!');
  }
  return text ;
}
//設定蜂鳴器音樂
function buzzer_music(m) {
  var musicNotes = {};
  musicNotes.notes = [];
  musicNotes.tempos = [];
  if (m[0].notes.length > 1) {
    for (var i = 0; i < m.length; i++) {
      if (Array.isArray(m[i].notes)) {
        var cn = musicNotes.notes.concat(m[i].notes);
        musicNotes.notes = cn;
      } else {
        musicNotes.notes.push(m[i].notes);
      }
      if (Array.isArray(m[i].tempos)) {
        var ct = musicNotes.tempos.concat(m[i].tempos);
        musicNotes.tempos = ct;
      } else {
        musicNotes.tempos.push(m[i].tempos);
      }
    }
  } else {
    musicNotes.notes = [m[0].notes];
    musicNotes.tempos = [m[0].tempos];
  }
  return musicNotes;
}  
//檢查webduino是否已連線成功
function deviceIsConnected(){
   if (Board_1===undefined)
      return false;
   else if (Board_1.isConnected===undefined)
      return false;
   else
      return Board_1.isConnected;
}
function deviceIsConnected2(){
   if (Board_2===undefined)
      return false;
   else if (Board_2.isConnected===undefined)
      return false;
   else
      return Board_2.isConnected;
}





