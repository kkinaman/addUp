var Users = require('./db/controllers/users');
var Charities = require('./db/controllers/charities');

var worker = require('./worker');
var paypalHelpers = require('./paypalHelpers');

//accurate interval timer +- 1ms
function interval(duration, fn){
  this.baseline = undefined

  this.run = function(){
    if(this.baseline === undefined){
      this.baseline = new Date().getTime()
    }
    fn()
    var end = new Date().getTime()
    this.baseline += duration

    var nextTick = duration - (end - this.baseline)
    if(nextTick<0){
      nextTick = 0
    }
    (function(i){
        i.timer = setTimeout(function(){
        i.run(end)
      }, nextTick)
    }(this))
  }

  this.stop = function(){
   clearTimeout(this.timer)
  }
}

// exports.callWorker.run();

weeklyCausePayout = function() {
  Charities.getCharityFields({type: 'custom'}, function(err, results) {
    if (err) {
      console.log(err);
    } else {
      var paypalInput = [];
      results.forEach(function(entry) {
        if (entry.paypalemail && entry.balance_owed > 0) {
          paypalInput.push({email: entry.paypalemail, value: entry.balance_owed});
          //set balance owed back to 0
          Charities.updateCharity(entry.id, {balance_owed: 0}, () => {});
        }
      });
      if (paypalInput.length > 0) {
        paypalHelpers.payoutCauses(paypalInput, function(err, result) {
          if (err) {
            console.log(err);
          }
        });
      }
    }
  });
};

//interval function, runs every 15 minutes //900000
exports.callWorker = new interval(900000, function() {
  // console.log('Plaid worker is running');
  worker.processDailyTransactions();
  //calls paypal payout
  setTimeout(weeklyCausePayout, 10000);
});
