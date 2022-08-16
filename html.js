let currentState;

document.addEventListener('DOMContentLoaded', function() {
    var link = document.getElementById('myBtn');
    // onClick's logic below:
    link.addEventListener('click', function() {

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, "Activate");
          });
          window.top.location = window.top.location
    });
});

  

chrome.runtime.sendMessage({type: "getState"}, function(active) {
    if(typeof active == "undefined") {
        // That's kind of bad
    } else {
        // Use active
        currentState = active;
        if(active=="true"){
             document.getElementById("current").innerHTML = "Active!";
             document.getElementById("current").style.color="green";

        }
        else{
            document.getElementById("current").innerHTML = "Not Active!";
            document.getElementById("current").style.color="red";
        }
    }

});