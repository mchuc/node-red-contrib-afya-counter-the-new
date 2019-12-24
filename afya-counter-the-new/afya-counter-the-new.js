/**
 * AFYA Counter The New by  Marcin Chuć
 * e-mail: marcin ...change it to at... afya.pl
 * (C) 2019
 */

module.exports = function(RED) {

  /**
   main function
  */
  function AFYACounterTheNew(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on('input', function(msgIn) {
      var now = Date.now();
      //Error if variableName not given
      if (config.variableName == -1) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "missconfigured - please edit this Node and set variableName and save it <" + timeConvert(now) + ">"
        });
        return;
      }

      /**
      Check configuration
      */
      var countTime = Math.round(Math.abs(config.countTime)) || 60000;
      var minTimePeriod = Math.round(Math.abs(config.minTimePeriod)) || 1000;
    
      if (minTimePeriod > countTime) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "missconfigured - minTimePeriod is greater than countTime - make correction, please <" + timeConvert(now) + ">"
        });
        return;

      }
      if (minTimePeriod == 0) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "state: config error - minTimePeriod must be grater than 0 !  <" + timeConvert(now) + ">"
        });
        return;
      }
      if (countTime == 0) {
        this.status({
          fill: "red",
          shape: "dot",
          text: "state: config error - countTime must be grater than 0 !  <" + timeConvert(now) + ">"
        });
        return;
      }



      var myCounter = node.context().flow.get(config.variableName) || {'counter':0,'countTime':countTime,'minTimePeriod':minTimePeriod,'stopTime':now+countTime,'variableName':config.variableName};
   
      var reset = false;
      var resetcounter = false;
      var resetall = false;
      // obsługa messages -> input
      if ('payload' in msgIn) {
        if (String(msgIn['payload']).toLowerCase() == "reset") {
         reset=true;
        } else if(String(msgIn['payload']).toLowerCase()=='resetcounter')
        {
        resetcounter=true;
        } else if (String(msgIn['payload']).toLowerCase() == 'resetall') {
        resetall=true;
        }
      }

      if(reset || resetall)
      {
        myCounter.stopTime=myCounter.stopTime+countTime;
      }
      if(resetcounter || resetall)
      {
        myCounter.counter=0; 
      }
      

      //save data
      node.context().flow.set(config.variableName,myCounter);

      /**
       * if timer exists - exit
       */
      if (myCounter.timer !== undefined) {
        return;
      }

      if (myCounter.recallTime === undefined) {
        myCounter.recallTime = myCounter.minTimePeriod;
      }

      node.context().flow.set(config.variableName, myCounter);
      

      this.status({
        fill: "blue",
        shape: "ring",
        text: "state: STARTING... counter: " + myCounter.counter + " ->; stop in " + (myCounter.stopTime - Date.now()) + " us <" + timeConvert(Date.now()) + ">"
      });

      msg = {
        payload: {
        counter: myCounter.counter,
        stopTime: myCounter.stopTime,
        recallTime: myCounter.recallTime,
        countTime: myCounter.countTime,
        minTimePeriod: myCounter.minTimePeriod,
        timestamp: Date.now(),
        state: "counting",
        msgIn: msgIn
        }
      }
      node.send(msg);
      myCounter.timer = setInterval(timeLoop, myCounter.recallTime, myCounter.variableName,node);
      
    });
  }

  /**
  function timeConvert returns string from given timestamp as i.e.: 2010-10-1 17:09:11
  */
  function timeConvert(myTimeStamp) {
    var d = new Date(myTimeStamp);
    var time = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('/') + ' ' + [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');
    return time;
  }
  /**
  function timeLoop 
  */
  //async function timeLoop(variableName, childNode) {
function timeLoop(variableName, childNode) {
  var now = Date.now();
    var myCounter = childNode.context().flow.get(variableName);
    myCounter.counter=myCounter.counter+1;
    childNode.context().flow.set(variableName,myCounter);
    childNode.status({
      fill: "green",
      shape: "dot",
      text: "state: ACTIVE counter: " + myCounter.counter + " ->; stop in " + (myCounter.stopTime- now) +" us <" + timeConvert(now) + ">"
    });

    //normal message
    var msg = {
      payload: {
        counter: myCounter.counter,
        stopTime: myCounter.stopTime,
        recallTime: myCounter.recallTime,
        countTime: myCounter.countTime,
        minTimePeriod: myCounter.minTimePeriod,
        timestamp: now,
        state: "counting",
      }
    }
    childNode.send(msg);
    /**
     * stop after time
    */
    if (myCounter.stopTime  <= now) {

      msg = {
        payload: {
          counter: myCounter.counter,
          stopTime: myCounter.stopTime,
          recallTime: myCounter.recallTime,
          countTime: myCounter.countTime,
          minTimePeriod: myCounter.minTimePeriod,
          timestamp: now,
          state: "end",
        }
      }
     var msg2 = {
        payload: {
          counter: myCounter.counter,
          stopTime: myCounter.stopTime,
          recallTime: myCounter.recallTime,
          countTime: myCounter.countTime,
          minTimePeriod: myCounter.minTimePeriod,
          timestamp: now,
          state: "waiting",
        }
      }


      childNode.send(msg);
      setTimeout(function () {
        childNode.send(msg2);
      }, 300);

      childNode.status({
        fill: "red",
        shape: "dot",
        text: "state: STOP counter: " + myCounter.counter + " <" + timeConvert(now) + ">"
      });
      deleteInterval(variableName, childNode);
    }
    // send message
   

  }
  /**
  function deleteInterval deletes my lullaby loop and cleans myLullaby in node
  */
  function deleteInterval(variableName, childNode) {
    var myCounter = childNode.context().flow.get(variableName);

    if (myCounter.timer !== undefined) {
      clearInterval(myCounter.timer);
    }
    childNode.context().flow.set(variableName,undefined)


  }

  //register node
  RED.nodes.registerType("afya-counter-the-new", AFYACounterTheNew);
}
