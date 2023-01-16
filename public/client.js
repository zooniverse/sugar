var SugarClient=class SugarClient{constructor(s,i){this.primusUrl=this.primusUrl.bind(this),this.connect=this.connect.bind(this),this.disconnect=this.disconnect.bind(this),this.receiveData=this.receiveData.bind(this),this.subscribeTo=this.subscribeTo.bind(this),this.unsubscribeFrom=this.unsubscribeFrom.bind(this),this.on=this.on.bind(this),this.off=this.off.bind(this),this.emit=this.emit.bind(this),this.__subscribeToChannels=this.__subscribeToChannels.bind(this),this.__subscribeTo=this.__subscribeTo.bind(this),this.createEvent=this.createEvent.bind(this),this.userId=s,this.authToken=i,this.events={},this.subscriptions={},this.initializePrimus()}initializePrimus(){var s="undefined"!=typeof Primus?Primus:SugarClient.prototype.Primus;return this.primus=s.connect(void 0,{websockets:!0,network:!0,manual:!0,ping:1e4}),this.primus.on("outgoing::url",this.primusUrl),this.primus.on("data",this.receiveData)}primusUrl(s){if(this.userId&&this.authToken)return s.query=`user_id=${this.userId}&auth_token=`+this.authToken}connect(){return this.disconnect(),this.primus.open()}disconnect(){for(var t,s=function(){var s=this.subscriptions,i=[];for(t in s)s[t],t.match(/^(session|user):/i)&&i.push(t);return i}.call(this),i=0,e=s.length;i<e;i++)t=s[i],delete this.subscriptions[t];return this.userKey=this.loggedIn=null,this.primus.end()}receiveData(s){return"connection"===s.type?("undefined"!=typeof console&&null!==console&&"function"==typeof console.info&&console.info("[CONNECTED] ",s),this.loggedIn=s.loggedIn,this.userKey=s.userKey,this.subscriptions[this.userKey]=!0,setTimeout(this.__subscribeToChannels,100)):this.emit(s)}subscribeTo(s){return!this.subscriptions[s]&&(this.subscriptions[s]=!0,this.__subscribeTo(s))}unsubscribeFrom(s){if(this.subscriptions[s])return delete this.subscriptions[s],this.primus.write({action:"Unsubscribe",params:{channel:s}})}on(s,i){var t;return(t=this.events)[s]||(t[s]=[]),this.events[s].push(i)}off(s,i){return i&&this.events[s]?this.events[s]=this.events[s].filter(function(s){return s!==i}):delete this.events[s]}emit(s){for(var i,t=this.events[s.type]||[],e=[],n=0,r=t.length;n<r;n++)i=t[n],e.push(i(s));return e}__subscribeToChannels(){var s,i=this.subscriptions,t=[];for(s in i)i[s],t.push(this.__subscribeTo(s));return t}__subscribeTo(s){return this.primus.write({action:"Subscribe",params:{channel:s}})}createEvent(s,i,t){return this.primus.write({action:"Event",params:{type:s,channel:i,data:t}})}};"undefined"!=typeof module&&null!==module&&(module.exports=SugarClient);
//# sourceMappingURL=./client.js.map