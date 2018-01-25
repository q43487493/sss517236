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

var myClientSecret={"installed":{"client_id":"479898043718-lup8n5jqu4966evfttbaqi54u8g0rk4c.apps.googleusercontent.com","project_id":"praxis-granite-191610","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://accounts.google.com/o/oauth2/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"Xw2vL6zIcBNxtKr8o381KQWo","redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]}}
var auth = new googleAuth();
var oauth2Client = new auth.OAuth2(myClientSecret.installed.client_id,myClientSecret.installed.client_secret, myClientSecret.installed.redirect_uris[0]);
oauth2Client.credentials ={"access_token":"ya29.Gls9BQU9XIxCcwKmh8x1DNBFw7KtZUtnz5yWIzzdNkGlLIuVSHwavOwF1brXAauVGCY5CLB6_bI_hi6ceK7vGrLuHsUxU5AHjMCUcNS6U42xvMxMmHHOct6nV23A","refresh_token":"1/ClJ-30WGZ8vjXlkHGKxkDw6yzVnowbf2pseYf2iMrk8","token_type":"Bearer","expiry_date":1515497815494}

var mySheetId='1knco-UIs-D8iX10zBba9sO0q0c-2uv5RdLIeFK-tBD0';


//new Date().toLocaleString()


var myBoardVars={device: '8QwwV'}; //Webduino的device id
var myBoardVars2={ device: '10Q28gDy', transport: 'mqtt'};
var myBoard;
var myBoard2;
var people = 0 ;               //家庭人數 
var card_uid = [] ;//卡號列表
var user_id =[];  //身分列表   
var door = [] ;  //不在家or在家中/列表 
var user_id_t = '' ;  //暫存身分
var add = '' ;       //新增
var admin = 0 ;     //管理員


getdata() ; //讀取試算表
//讀取試算表的函式
  function getdata() {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.get({
     auth: oauth2Client,
     spreadsheetId: mySheetId,
     range:encodeURI('資料庫'),  //試算表-工作表名稱
  }, function(err, response) {	
  var data = response.values;	  // 讀取資料以二維陣列表示  [列][攔]
   if (err) {            
     console.log('讀取資料庫的API產生問題：' + err);
     return;
    }   	 
   else {	   
     var f = (data.length);	 
         card_uid = data[f-6];  //0
         user_id =  data[f-5];	//1
		 door = data[f-4];      //2
	     people = data[f-3][0];	//3,1
         console.log('資料庫已取得完畢！');
        } 
  });
} 
 
 
//上傳試算表的函式
 function appendMyRow() {
   var request = {
      auth: oauth2Client,
      spreadsheetId: mySheetId,
      range:encodeURI('資料庫'),
      insertDataOption: 'INSERT_ROWS',
      valueInputOption: 'RAW',
      resource: {
        "values": [      
        card_uid,      //第一列  [第一欄,第二欄,.... ]
        user_id,      //第二列  
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


//尋找字元函式
 function text_get_substring(text, where1, at1, where2, at2) {
  function getAt(where, at) {
    if (where == 'FROM_START') {
      at--;
    } else if (where == 'FROM_END') {
      at = text.length - at;
    } else if (where == 'FIRST') {
      at = 0;
    } else if (where == 'LAST') {
      at = text.length - 1;
    } else {
      throw 'Unhandled option (text_getSubstring).';
    }
    return at;
  }
  at1 = getAt(where1, at1);
  at2 = getAt(where2, at2) + 1;
  return text.slice(at1, at2);
}

//LineBot處理文字訊息的函式
bot.on('message', function(event) {
   var myReply='';
   if (event.message.type === 'text') {
      myReply=processText(event.message.text);
   } 
   console.log('sticker');
   event.reply(myReply).then(function(data) {   
      console.log('訊息已傳送！');   // success 
   }).catch(function(error) {
      console.log('error');       // error 
   });
});
 

function processText(myMsg){
   var myResult=setIoT(myMsg);  
   var txt_p =  myMsg.indexOf(':') + 1;   
   var txt_c = text_get_substring(myMsg, 'FROM_START', 1 , 'FROM_START', txt_p - 1);  
   var t = myMsg.length ;
   if (myResult!=''){}
   else if (txt_c ==='新增門禁卡' && admin === 1234 ){	  	  
      user_id_t = text_get_substring(myMsg, 'FROM_START', txt_p + 1 , 'FROM_START', t);
	  var f = (user_id.length);	  		  
		 for (var j = 0; j <= f-2; j++) {
		   if (user_id[j] === user_id_t  ){
		     myResult = '此身分已有，請換別的稱呼';
		     user_id_t ='';	
             add = '' ;
			 break;
	        }		        
        }
       if (user_id_t != ''){
		 myResult = '請在10秒內感應需要新增的門禁卡';
         add = '新增' ;    
	    }   
     setTimeout(function () { 
	     if (add === '新增') {
             bot.push('U79964e56665caa1f44bb589160964c84', '新增時間已過!');			 
             user_id_t ='';	
             add = '' ;	
		    }
        }, 1000 * 10);		       	   
    }        
  else if (txt_c ==='刪除門禁卡' && admin === 1234){	  	  
      user_id_t = text_get_substring(myMsg, 'FROM_START', txt_p + 1 , 'FROM_START', t);
	  var f = (user_id.length);	  		  
		 for (var j = 0; j <= f-2; j++) {
		   if (user_id[j] === user_id_t  ){           
               if (f === 1)
                 myResult= '只剩' + user_id.join('')  +'，無法刪除!';
               else {
			       if (door[j] === '在家中' ){
					 people = people - 1 ;			    
			        }
                 card_uid.splice(j, 1);
                 user_id.splice(j, 1);
				 door.splice(j, 1);				 
                 myResult= '刪除成功!'; 	                				 			    
		        }
			 user_id_t ='';
			 appendMyRow();
		     break;
	        }		
        }
		if (user_id_t != ''){
	     myResult= '沒有這位身分!';       
	     user_id_t ='';  			
		}     	   
    }   
   else if (myMsg==='目前家中人數')	   
       myResult='目前家中有' + people +'人'  ;   
   else if (myMsg==='連線狀況')
	  if (!deviceIsConnected())
         myResult='裝置未連接！';
      else{
         myResult='裝置連接中！';        
      }
	  
	else if (myMsg === '1234'){
	 admin = 1234 ;
	 myResult='管理員權限已開啟，權限啟動時間為1分鐘\n 管理功能: \n 1.啟動緊急開關碼5688 \n 2.新增門禁卡:XX \n 3.刪除門禁卡:XX \n XX 為 身分';  
	 setTimeout(function () { 
	     admin = 0 ;
		 bot.push('U79964e56665caa1f44bb589160964c84', '管理權限啟動時間結束!');	
        }, 1000 * 60);	
	}		
   return myResult;
}

//處理webduino腳位開關的函式
function setIoT(fromMsg){
   var returnResult='';  
   
   if (fromMsg==='1234' && admin === 5688){    
         if (!deviceIsConnected())
         returnResult='裝置未連接！';
      else{
         returnResult='已啟動緊急開關';
		 relay.on();
		 setTimeout(function () {                   
	     relay.off();
        }, 1000 * 2);	            
      }     
   }
   
   else if (fromMsg==='開燈'){    
         if (!deviceIsConnected2())
         returnResult='裝置未連接！';
      else{
         returnResult='電燈已開啟!';
		 relay2.on();		 	            
        }     
   }
   else if (fromMsg==='關燈'){    
         if (!deviceIsConnected2())
         returnResult='裝置未連接！';
      else{
         returnResult='電燈已關閉!';
		 relay2.off();		 	            
        }     
   }    
   return returnResult;
}


// 連接開發版以及開發版與各裝置連接的函示
boardReady(myBoardVars, true, function (board) {
   myBoard=board;
   board.systemReset();
   board.samplingInterval = 250;
   relay = getRelay(board, 5);
   relay.off();
   buzzer = getBuzzer(board, 2);  
   rfid = getRFID(board);
   rfid.read();     
   rfid.on("enter",function(_uid){
   rfid._uid = _uid;
   
   if (add ===  '新增' ){   
	   var f = (card_uid.length);	  		  
		 for (var j = 0; j <= f-2; j++) {
		   if (card_uid[j] === rfid._uid  ){
		     bot.push('U79964e56665caa1f44bb589160964c84', '此門禁卡已存在!');	
		     user_id_t ='';	
             add = '' ;
			 break;
	        }				 
        }
	 if (add === '新增'){	
	     people = people + 1 ;
	     user_id.splice(0,0,user_id_t);
	     card_uid.splice(0,0,rfid._uid);
	     door.splice(0,0,'在家中');
	     bot.push('U79964e56665caa1f44bb589160964c84', '新增成功!');
	     buzzer.play(buzzer_music([  {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );
	     user_id_t ='';	
         add = '';	
		 appendMyRow();
		  
	    }
    }	
 //判斷卡號與對應身分及目前動作	
  else{   
     var f = (card_uid.length);	  		  
		 for (var j = 0; j <= f-2; j++) {
		   if (card_uid[j] === rfid._uid  ){
		       if (door[j] === '在家中'){
	              people = people -1 ;		 
			      bot.push('U79964e56665caa1f44bb589160964c84', '"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' );
				  bot.push('U521b36e35725cf42a964ed5394806142', '"' + user_id[j]  +'" 出門，家裡人數:' + people  + '人在家' );
			      door[j] = '不在家';			 
			    }
			   else if (door[j] === '不在家'){
				 people = people + 1;  		 
			     bot.push('U79964e56665caa1f44bb589160964c84','"' + user_id[j]  +'" 回家，家裡人數:' + people  + '人在家' );
				 bot.push('U521b36e35725cf42a964ed5394806142','"' + user_id[j]  +'" 回家，家裡人數:' + people  + '人在家' );
			     door[j] = '在家中';												
				}
			 appendMyRow(); 	
			 relay.on();
	         setTimeout(function () {                   
	         relay.off();
             }, 1000 * 3);
			 rfid._uid = '' ;
			 break;
	        }		
        }
     if (rfid._uid != ''){
	     bot.push('U79964e56665caa1f44bb589160964c84','有外來人士感應\n卡號:' + rfid._uid);
		 bot.push('U521b36e35725cf42a964ed5394806142','有外來人士感應\n卡號:' + rfid._uid);
	     buzzer.play(buzzer_music([  {notes:"C7",tempos:"1"}]).notes ,buzzer_music([  {notes:"C7",tempos:"1"}]).tempos );	 
        }
	} 
});  
   });
   
boardReady(myBoardVars2, true, function (board) {
   myBoard2=board;
   board.systemReset();
   board.samplingInterval = 50;
   relay2 = getRelay(board, 5);
   relay2.off();
}); 
 
//設定蜂鳴器音樂函示
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
  

//檢查webduino是否已連線成功的函式
function deviceIsConnected(){
   if (myBoard===undefined)
      return false;
   else if (myBoard.isConnected===undefined)
      return false;
   else
      return myBoard.isConnected;
}
function deviceIsConnected2(){
   if (myBoard2===undefined)
      return false;
   else if (myBoard.isConnected===undefined)
      return false;
   else
      return myBoard.isConnected;
}

const app = express();
const linebotParser = bot.parser();
app.post('/', linebotParser);

//express 預設走 port 3000，而 heroku 上預設卻不是，透過下列程式轉換
var server = app.listen(process.env.PORT || 8080, function() {
  var port = server.address().port;
  console.log("App now running on port", port);
});
