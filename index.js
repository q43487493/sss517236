require('webduino-js');
require('webduino-blockly');
var request = require("request");
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
var device_id_3={device: 'a3GjV'};
var Board_1 ;  
var Board_2 ;
var Board_3 ;
var admin = 0 ;       //管理員
var people =0 ;      //家庭總人數
var line_id = [] ;  // LINE 身分列表 
var card_uid = [] ;//卡號列表
var user_id =[] ; //門禁卡身分列表   
var door = [] ;  //進or出門列表  
var card_add = '' ;           //新增卡號
var line_add = '' ;          //新增LINE使用者
var admin_1_2_3_4_5_6 = '' ;//暫存新增刪除總變數
var line_id_t = '' ;    //暫存line id 
var user_id_t = '' ;   //暫存身分位置
var pm_25 ; 
var humid ; 
var soill ;
var data_1 = [] ; //區
var data_2 = [] ; //市
var data_3 = [] ; //pm
var g = '' ;      //暫存'區''
var open_1 ;
var open_2 ;
getdata(); 
getdata_2();
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
  var f = user_id.length
  var m = 0 ;
  Board_1=board;
  board.systemReset();
  board.samplingInterval = 250;
  relay_1 = getRelay(board, 5);//門鎖
  relay_1.off();
  buzzer = getBuzzer(board, 2);  
  rfid = getRFID(board);
  rfid.read();     
  rfid.on("enter",function(_uid){
    rfid._uid = _uid;
    door_RFID(_uid);
  });  
  soil = getSoil(board, 3);//土壤濕度A3
  soil.measure(function(val){
    soil.detectedVal = val;
    soill = soil.detectedVal;/*
    if (soil.detectedVal <= 20){
      for (var t = 0 ; t<= f-1 ; t++){
        bot.push(line_id[t],[{ type: 'text', text: '目前土壤濕度低於20%，建議您啟動澆水裝置!'},Watering()]);   
      }
    } */
    if (soil.detectedVal <= 25){
      if (m != 1){
        m = 1 ;
        for (var t = 0 ; t<= f-1 ; t++){
          bot.push(line_id[t],[{ type: 'text', text: '目前土壤濕度低於25%，建議您啟動澆水裝置!'},Watering()]);   
        }
      }
    } 
    else if (soil.detectedVal >= 60){
      m = 0 ;
    }
  });
});   
boardReady(device_id_2, true, function (board) {
  var m = 0 ;
  var f = user_id.length
  Board_2=board;
  board.systemReset();
  board.samplingInterval = 50;
  relay_2 = getRelay(board, 5);//燈
  relay_4 = getRelay(board, 16);//水泵
  relay_2.off();
  relay_4.off();
  g3 = getG3(board, 2,3); //pm25
  g3.read(function(evt){
    pm_25 = g3.pm25 ;
    if (g3.pm25 >= 30){
      if (m != 1){
        m = 1 ;
        for (var t = 0 ; t<= f-1 ; t++){
          bot.push(line_id[t],[{ type: 'text', text: '目前家中pm2.5高於30，建議您開啟空氣清淨機!'},Clean()]);   
        }
      }
    } 
    else if (g3.pm25 <= 10){
      if (m === 1){
        for (var t = 0 ; t<= f-1 ; t++){
          bot.push(line_id[t],[{ type: 'text', text: '目前家中pm2.5已低於10，建議您關閉空氣清淨機!'},Clean()]);   
        }
      }
      m = 0 ;
    }
  }, 1000 * 1);
}); 
boardReady(device_id_3, true, function (board) {
  Board_3=board
  board.systemReset();
  board.samplingInterval = 50;
  relay_3 = getRelay(board, 6);//風扇
  relay_3.off();
  var m = 0 ; 
  var f = user_id.length
  dht = getDht(board, 9); //溫溼度
  dht.read(function(evt){
    humid = dht.humidity
    if (dht.humidity >= 30){
      if (m != 1){
        m = 1 ;
        for (var t = 0 ; t<= f-1 ; t++){
          bot.push(line_id[t],[{ type: 'text', text: '目前浴室濕度高於30%，建議您開啟抽風機!'},Exhaust()]);   
        }
      }
    }
    else if (dht.humidity <= 10){
      if (m === 1){
        for (var t = 0 ; t<= f-1 ; t++){
          bot.push(line_id[t],[{ type: 'text', text: '目前浴室濕度以低於10%，建議您關閉抽風機!'},Exhaust()]);   
        }
      } 
      m = 0 ;
    }
  }, 1000 * 1);
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
    if (err) {            
      console.log('讀取門禁資料庫發生問題：' + err);
      return;
    }      
    else {
      data_sort(response.values);  // 讀取資料以二維陣列表示  [列][攔]
      console.log('門禁資料庫已取得完畢！');
    } });
}
//將讀取的資料分類
function data_sort(data){
  var f_1 = data.length;  
  var text = [];
  for (j = 0 ; j <= f_1-2 ; j++){
    text[j] =  data[j][0]  ;
  }
  var f_2 = text.lastIndexOf('----------------------------')+1; 
  var k = 0 ;
  for (j = f_2 ; j <= f_1-2 ; j++){
    line_id[k] = data[j][0]; 
    card_uid[k] = data[j][1]; 
    user_id[k] = data[j][2]; 
    door[k] = data[j][3];  
    k = k + 1 ;
  }
  people = parseFloat(data[f_2][4]);
}
//上傳試算表-資料庫
function add_date() {
  dele_data();
  setTimeout(function () {                   
      add_data2();
  }, 500 );
  var request = {
    auth: oauth2Client,
    spreadsheetId: SheetId,
    range:encodeURI('資料庫'),
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: 'RAW',
    resource: {
      'values': add_data_sort()                        
    }};
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.append(request, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }});
} 
//分類要上傳的資料
function add_data_sort() {
  var form = [];
  var f = user_id.length;
  for (var j = 0 ; j<= f-1 ;j++ ){
    if (j === 0)
      form[j] = [line_id[j],card_uid[j],user_id[j],door[j],people,new Date()];
    else{
      form[j] = [line_id[j],card_uid[j],user_id[j],door[j]];
    }
    form[f] = ['----------------------------'];
  }
  return form;
}
//上傳簡易資料至試算表
function add_data2() {
  var request = {
    auth: oauth2Client,
    spreadsheetId: SheetId,
    range:encodeURI('資料庫!G2:H2'),
    insertDataOption: 'OVERWRITE',
    valueInputOption: 'RAW',
    resource: {
      'values': add_data2_sort()                        
    }};
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.append(request, function(err, response) {
    if (err) {
      console.log(err);
      return;
    }});
}
//分類要上傳的簡易資料
function add_data2_sort(){
  var form = [];
  var f = user_id.length;
  for (var j = 0 ; j<= f-1 ;j++ ){
      form[j] = [user_id[j],door[j]];
    }
  return form;
}
//刪除部分資料
function dele_data(){
  var request = {
    auth:oauth2Client,
    spreadsheetId:SheetId,
    resource: {
      ranges: ['G:H'],
    }};
  var sheets = google.sheets('v4')
  sheets.spreadsheets.values.batchClear(request, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }});
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
      Result= [{ type: 'text', text: '管理功能使用時間為90秒。'},{ type: 'text', text: '資料庫連結:https://goo.gl/PMx5q9'},
              { type: 'template',
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
              }]
      setTimeout(function () { 
        admin = 0 ;
        admin_1_2_3_4_5_6= '' ;        
        line_add = '';
        card_add = '';
        bot.push('U79964e56665caa1f44bb589160964c84', '管理權限啟動時間結束!'); 
      } , 1000 * 90);
    } 
    else{
      Result='您未具備管理身分，無法啟用!';  
    } 
  }
  else if (line_add === '新增' && message === '159'){
    var f = user_id.length;
    for (var k = 0 ; k<= f-1 ; k++){
      if (line_id[k] === line_id_t){
        bot.push('U79964e56665caa1f44bb589160964c84', '新增失敗，該用戶以代表一位使用者');
        Result = '您身分為:' + user_id[k] + '\n早就能用LINE來開門喔!'  ;
        line_add = '';
        break;
      }
    }
    if (line_add === '新增'){
      line_id[user_id_t] = line_id_t ;
      bot.push('U79964e56665caa1f44bb589160964c84', { type: 'image',originalContentUrl: 'https://i.imgur.com/j3jSYIb.png', previewImageUrl: 'https://i.imgur.com/j3jSYIb.png' });
      Result = '可以使用LINE來開門囉!\n您身分為:' + user_id[user_id_t] ;
      add_date();
      line_add = '';
    }
  }   
  else if (message==='目前家中人數')	   
    Result='目前家中有' + people +'人';
  else if (message==='目前家中pm2.5'){   
      if (!deviceIsConnected2())
      Result='裝置未連接！';
    else{
      Result = 'pm2.5:' + pm_25 ;               
    }  
  }     
  else if (message==='目前浴室濕度'){
    if (!deviceIsConnected3())
      Result='裝置未連接！';
    else{
      Result='濕度:' + humid ;              
    }        
  } 
  else if (message==='開啟所有控制選單'){
    Result = [Watering(),Clean(),Exhaust()] ;
  }  
  else if (message==='目前外面空氣品質'){
    Result = '請輸入您所在的地區!\n\n' +
    '以下為可查詢的地區:\n' +
    '麥寮、關山、馬公、金門、馬祖\n' +
    '埔里、復興、永和、竹山、中壢\n' +
    '三重、冬山、宜蘭、陽明、花蓮\n' +
    '臺東、恆春、潮州、屏東、小港\n' +
    '前鎮、前金、左營、楠梓、林園\n' +
    '大寮、鳳山、仁武、橋頭、美濃\n' +
    '臺南、安南、善化、新營、嘉義\n' +
    '臺西、朴子、新港、崙背、斗六\n' +
    '南投、二林、線西、彰化、西屯\n' +
    '忠明、大里、沙鹿、豐原、三義\n' +
    '苗栗、頭份、新竹、竹東、湖口\n' +
    '龍潭、平鎮、觀音、大園、桃園\n' +
    '大同、松山、古亭、萬華、中山\n' +
    '士林、淡水、林口、菜寮、新莊\n' +
    '板橋、土城、新店、萬里、汐止\n' +
    '基隆' ;
    g = '區' ;
    request({
      url: 'https://opendata.epa.gov.tw/ws/Data/ATM00625/?$format=json&callback=?',
      method: "GET"
    }, function(e,r,b) {  
      if (e || !b) { return;}
      else {database(b);} 
    });
  }
  else if ( g === '區'){
    var f = open_1.length;
    for (var j = 0 ; j <= f-1 ; j++){
      if (message === open_1[j]){
        Result = '目前' + open_1[j] +'的pm2.5為'+ open_2[j];
        break;
      }
      else {
        Result = '請檢查是否輸入錯誤~';
      }
    }
      g = '' ;
  }       
  else{
    Result = '謝謝回覆!' ;
  } 
  return Result;
}
//處理選單回傳訊息
function botpostback(message){
  var Result = '';
  if (message === '新增使用者' && admin === 1234 || message === '刪除使用者' && admin === 1234 || message === '新增LINE UID' && admin === 1234 || message === '刪除LINE UID' && admin === 1234 || message === '新增卡號' && admin === 1234 || message === '刪除卡號' && admin === 1234 ){
    Result = message + '\n請輸入使用者名稱';
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
//處理抽風機控制選單訊息
function Exhaust(){
 return {
  type: 'template',
  altText: 'this is a confirm template',
  template: {
      type: 'confirm',
      text: '抽風機控制選單',
      actions: [
          {
            type: 'message',
            label: '開啟抽風機',
            text: '開啟抽風機'
          },
          {
            type: 'message',
            label: '關閉抽風機',
            text: '關閉抽風機'
          }]}};
}
//處理空氣清淨機機控制選單訊息
function Clean(){
 return {
  type: 'template',
  altText: 'this is a confirm template',
  template: {
      type: 'confirm',
      text: '空氣清淨機控制選單',
      actions: [
          {
            type: 'message',
            label: '開啟清淨機',
            text: '開啟清淨機'
          },
          {
            type: 'message',
            label: '關閉清淨機',
            text: '關閉清淨機'
          }]}};
}
//處理水泵控制選單訊息 
function Watering(){
 return {
  type: 'template',
  altText: 'this is a confirm template',
  template: {
      type: 'confirm',
      text: '請問是否澆花',
      actions: [
          {
            type: 'message',
            label: 'yes',
            text: '開啟澆花器',
          },
          {
            type: 'message',
            label: 'no',
            text: 'no'
          }]}};
}
//處理管理功能
function admin_door(message){
  var Result = '';
  var f = (user_id.length);  
  if (admin_1_2_3_4_5_6=== 1 || admin_1_2_3_4_5_6=== 2 || admin_1_2_3_4_5_6 === 3 || admin_1_2_3_4_5_6 === 4 || admin_1_2_3_4_5_6 === 5 || admin_1_2_3_4_5_6 === 6  ){
    line_add = '';
    card_add = '';
  } 
  if (admin_1_2_3_4_5_6=== 1  ){
    for (var j = 0 ; j <=f-1 ; j++){
      if (user_id[j] === message){
        Result = '此使用者已存在';
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
      Result = { type: 'image',originalContentUrl: 'https://i.imgur.com/j3jSYIb.png', previewImageUrl: 'https://i.imgur.com/j3jSYIb.png' };
      add_date();
    }
  }
  else if (admin_1_2_3_4_5_6=== 2 ){
    for (var j = 0; j <= f-1; j++) {
      if (user_id[j] === message ){           
        if (f === 1){
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
          Result= { type: 'image',originalContentUrl: 'https://i.imgur.com/8c3YYGi.png', previewImageUrl: 'https://i.imgur.com/8c3YYGi.png' };                                    
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
    for (var j = 0; j <= f-1; j++) {
      if (user_id[j] === message  ){
        Result = '請讓要新增的LINE使用者傳送"159"訊息';
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
    for (var j = 0; j <= f-1; j++) {
      if (user_id[j] === message  ){
        Result = { type: 'image',originalContentUrl: 'https://i.imgur.com/8c3YYGi.png', previewImageUrl: 'https://i.imgur.com/8c3YYGi.png' };
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
    for (var j = 0; j <= f-1; j++) {
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
    for (var j = 0; j <= f-1; j++) {
      if (user_id[j] === message  ){
        Result = { type: 'image',originalContentUrl: 'https://i.imgur.com/8c3YYGi.png', previewImageUrl: 'https://i.imgur.com/8c3YYGi.png' };
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
      Result={ type: 'image',originalContentUrl: 'https://i.imgur.com/zOCTs9N.png', previewImageUrl: 'https://i.imgur.com/zOCTs9N.png' };
      relay_2.on();		 	            
    }               			
  }
  else if (message==='關燈'){    
    if (!deviceIsConnected2())
      Result='裝置未連接！';
    else{ 
      Result={ type: 'image',originalContentUrl: 'https://i.imgur.com/bAZPahb.png', previewImageUrl: 'https://i.imgur.com/bAZPahb.png' };
      relay_2.off();		 	            
    }  
  }
  else if (message==='開啟抽風機'){
    if (!deviceIsConnected3())
      Result='裝置未連接！';
    else{
      Result='抽風機已開啟!';
      relay_3.on();                  
    }                    
  }    
  else if (message==='關閉抽風機'){
    if (!deviceIsConnected3())
      Result='裝置未連接！';
    else{
      Result='抽風機已關閉!';
      relay_3.off();                  
    }                      
  }
  else if (message==='開啟清淨機'){
    if (!deviceIsConnected3())
      Result='裝置未連接！';
    else{
      Result='清淨機已開啟!';
      relay_3.on();                  
    }                      
  }
  else if (message==='關閉清淨機'){
    if (!deviceIsConnected3())
      Result='裝置未連接！';
    else{
      Result='清淨機已關閉!';
      relay_3.off();                 
    } 
  } 
  else if (message==='開啟澆花器'){
    if (!deviceIsConnected2())
      Result='裝置未連接！';
    else{
      Result='已經幫您澆花囉~';
      relay_4.on();
      setTimeout(function () {                   
        relay_4.off();
      }, 1000 * 7);                
    }                      
  }                           
  return Result;
}
//處理RFID開門
function door_RFID(UID){ 
  if (card_add ===  '新增' ){   
    var f = (card_uid.length);	  		  
    for (var j = 0; j <= f-1; j++) {
      if (card_uid[j] === UID  ){
        bot.push('U79964e56665caa1f44bb589160964c84', '新增失敗，該卡以代表一位使用者');
        buzzer.play(buzzer_music([ {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );	
        card_add = '' ;
        break;
      }				 
    }
    if (card_add === '新增'){	
      card_uid[user_id_t] = UID;
      bot.push('U79964e56665caa1f44bb589160964c84',[{ type: 'image',originalContentUrl: 'https://i.imgur.com/j3jSYIb.png', previewImageUrl: 'https://i.imgur.com/j3jSYIb.png' },{ type: 'text', text: '此卡號為:' + UID}]);
      buzzer.play(buzzer_music([ {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );
      card_add = '';	
      add_date();
    }
  }		
  else{   
    var user_f = (user_id.length); 
    var f = (card_uid.length);	  		  
    for (var j = 0; j <= f-1; j++) {
      if (card_uid[j] === UID  ){
        if (door[j] === '在家中'){
        people = people -1 ;		 
        door[j] = '不在家';			 
          for (var t = 0 ; t<= user_f-1 ; t++){   
            bot.push(line_id[t],{ type: 'image',originalContentUrl: 'https://i.imgur.com/u1UxDLY.png?1', previewImageUrl: 'https://i.imgur.com/u1UxDLY.png?1' });  
            bot.push(line_id[t],'"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' ); 
          }   
        }
        else if (door[j] === '不在家'){
          people = people + 1;  		 
          door[j] = '在家中';	           	
          for (var t = 0 ; t<= user_f-1 ; t++){ 
            bot.push(line_id[t],{ type: 'image',originalContentUrl: 'https://i.imgur.com/u1UxDLY.png?1', previewImageUrl: 'https://i.imgur.com/u1UxDLY.png?1' });  
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
//處理LINE開門
function door_LINE(UID){  
  var text ;  
  var f = (line_id.length);         
  for (var j = 0; j <= f-1; j++) {
    if (line_id[j] === UID  ){
      if (door[j] === '在家中'){
        people = people -1 ;     
        door[j] = '不在家';   
        for (var t = 0 ; t<= f-1; t++){
          bot.push(line_id[t],{ type: 'image',originalContentUrl: 'https://i.imgur.com/u1UxDLY.png?1', previewImageUrl: 'https://i.imgur.com/u1UxDLY.png?1' });
          bot.push(line_id[t],'"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' );                         
        }
      }
      else if (door[j] === '不在家'){
        people = people + 1;  
        door[j] = '在家中'; 
        for (var t = 0 ; t<= f-1; t++){
          bot.push(line_id[t],{ type: 'image',originalContentUrl: 'https://i.imgur.com/u1UxDLY.png?1', previewImageUrl: 'https://i.imgur.com/u1UxDLY.png?1' });
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
    bot.push('U79964e56665caa1f44bb589160964c84','有外來人士\n此人Line_UID:' + UID);
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
function deviceIsConnected3(){
   if (Board_3===undefined)
      return false;
   else if (Board_3.isConnected===undefined)
      return false;
   else
      return Board_3.isConnected;
}
//分類抓到的公開資料
function database(d){
 var txt = '';
 var txt_t = '' ;
 for (j = 0 ; j <= d.length ; j++ ){
   txt =  txt + d[j]; 
  }
 txt = txt.split('}');
 for (j = 0 ; j <= txt.length-1 ; j++){
   txt[j] = txt[j].split(',');
   for (t = 0 ; t <= txt[j].length-1 ; t++){
     txt[j][t] = txt[j][t].split(':');
     for(k = 0 ; k <=txt[j][t].length-1 ; k++){
       txt[j][t][k] = txt[j][t][k].split('"');
      }
    }
  }
 data_1[0]=txt[0][0][1][1] ;
 data_2[0]=txt[0][1][1][1] ;
 data_3[0]=txt[0][2][1][1] ;
 txt_t =  '地區:' +txt[0][0][1][1] + '\n縣市:'+ txt[0][1][1][1]  +'\n目前pm2.5:' + txt[0][2][1][1];
 for (j = 1 ; j <= txt.length-2 ; j++ ){
   txt_t = txt_t + "\n\n" +  '地區:' +txt[j][1][1][1] + '\n縣市:'+ txt[j][2][1][1]  +'\n目前pm2.5:' + txt[j][3][1][1];
  data_1[j]=txt[j][1][1][1] ;
  data_2[j]=txt[j][2][1][1] ;
  data_3[j]=txt[j][3][1][1] ;
  }
 opendata();
 console.log('公開資料處理完畢');
}
//上傳分類好的公開資料
function opendata() {
   var request = {
      auth: oauth2Client,
      spreadsheetId: SheetId,
      range:encodeURI('外面空氣品質!A1:BX1'),
      insertDataOption: 'INSERT_ROWS',
      valueInputOption: 'RAW',
      resource: {
        "values": [      
        data_2,
        data_1,
        data_3
     ]                         
     }
   };
   var sheets = google.sheets('v4');
   sheets.spreadsheets.values.append(request, function(err, response) {
      if (err) {
         console.log('The API returned an error: ' + err);
         return;
      }
      else{console.log('pm2.5上傳成功');getdata_2();}
   });
}
//讀取pm資料
function getdata_2() {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
    auth: oauth2Client,
    spreadsheetId: SheetId,
    range:encodeURI('外面空氣品質'),  
  }, function(err, response) {  
    if (err) {            
      console.log('讀"取外面空氣品質"資料庫發生問題：' + err);
      return;
    }      
    else {
      data_sort_2(response.values);
    } });
}
//將讀取的pm資料分類
function data_sort_2(data){
  var f = data.length;  
  var text_1 = data[f-2].join(',');//抓區
  var text_2 = data[f-1].join(',');//抓pm253
  open_1 = text_1.split(',');
  open_2 = text_2.split(',');
  console.log('讀取pm25成功');
}



//bot.push('U79964e56665caa1f44bb589160964c84',[{ type: 'text', text: '目前家中pm2.5高於25，建議您開啟空氣清淨機!'},Clean()]);   
//bot.push('U79964e56665caa1f44bb589160964c84',[{ type: 'text', text: '目前浴室濕度高於20%，建議您開啟抽風機!'},Exhaust()]);
//bot.push('U79964e56665caa1f44bb589160964c84',[{ type: 'text', text: '目前土壤濕度低於25%，建議您啟動澆水裝置!'},Watering()]);   
