chrome.runtime.sendMessage({
  type: "setState",
  active: localStorage.getItem("convert"),
});

chrome.runtime.onMessage.addListener(function (request) {
  switch (request) {
    case "Activate":
      apply();
      break;
  }
  return true; // Ensures it is async
});

if (!localStorage.getItem("rubleRate")) {
  getRubleRate();
}
if (!localStorage.getItem("rubleRateUSD")) {
  getRubleRateUsd();
}
var proceed = false;
let convert = localStorage.getItem("convert");
var prices = [];
var pricesSale = [];
let counter = 0,
  alertCounter = 0;
var rubleRate;
var countryCode;
var currency = "ILS";
var pricesNew;
var cartPrices;
var cartValue;
let limit;

$(document).ready(function () {
  setLimit();
  pricesNew = document.getElementsByTagName("span");
  if (localStorage.getItem("convert") == "true") {
    applyChanges();
    checkLimit();
  } else {
    localStorage.setItem("convert", "false");
  }

  if (document.location.origin == "https://www.asos.com") {
    checkCurrency();
  }
});

function changeToIls(rub) {
  rubleRate = localStorage.getItem("rubleRate");
  return (rub / rubleRate).toFixed(2) + " ₪";
}

function changeToUsd(rub) {
  rubleRate = localStorage.getItem("rubleRateUSD");
  return (rub / rubleRate).toFixed(2) + " $";
}

function apply() {
  if (localStorage.getItem("convert") == "true") {
    localStorage.setItem("convert", "false");
    location.reload();
  } else {
    applyChanges();
    localStorage.setItem("convert", "true");
  }
  chrome.runtime.sendMessage({
    type: "setState",
    active: localStorage.getItem("convert"),
  });
}

function applyChanges() {
  let subtotalPrice;
  if (
    document.getElementsByClassName("bag-subtotal-price").length > 0 &&
    $('*[data-test-id="miniBagSubTotal"]')[0]
  ) {
    subtotalPrice = document.getElementsByClassName("bag-subtotal-price")[0];
  }
  if (localStorage.getItem("convert") == "true") {
    if (pricesNew) {
      cartPrices = document.querySelectorAll("[data-test-id]");
      cartPrices = Array.from(cartPrices);
      pricesNew = document.getElementsByTagName("span");
      pricesNew = Array.from(pricesNew);
      pricesNew = pricesNew
        .concat(cartPrices)
        .concat(Array.from(document.getElementsByTagName("small")));
      let updated = pricesNew.filter(function (price) {
        if (price.innerText.length < 20) {
          if (price.innerText.includes("руб.")) {
            return price;
          }
        }
      });
      for (let i = 0; i < updated.length; i++) {
        let price = updated[i];
        if (price.innerText.includes("руб.")) {
          if (price.children.length > 0) {
            price = price.firstElementChild;
          }
          let currentString = price.innerText.slice(5);
          let currentPrice = parseFloat(
            price.innerText.slice(5).replace(",", "")
          );
          if (isNaN(currentPrice)) {
            currentString = price.innerText.slice(9);
            currentPrice = parseFloat(
              price.innerText.slice(9).replace(",", "")
            );
          }
          let newstring =
            currency == "ILS"
              ? price.innerText.replace("руб.", "ILS: ")
              : price.innerText.replace("руб.", "USD: ");
          newstring = newstring.replace(
            currentString,
            currency == "ILS"
              ? changeToIls(currentPrice)
              : changeToUsd(currentPrice)
          );
          if (newstring.includes("RRP")) {
            price.textContent = newstring.substring(4);
          } else {
            if (
              subtotalPrice &&
              subtotalPrice.innerText.slice(5) == currentString
            ) {
              subtotalPrice.innerText = newstring;
            }
            if (newstring.includes("NaN")) {
              continue;
            }
            if (
              price.dataset.testId == "miniBagSubTotal" &&
              document.getElementById("totalPrice")
            ) {
              let temp = changeToIls(
                parseFloat(price.innerText.slice(5).replace(",", ""))
              );
              if (document.getElementById("totalPrice").innerText != temp) {
                document.getElementById("totalPrice").innerText = temp;
              }
              continue;
            }
            price.innerHTML = newstring;
          }
        } else {
          continue;
        }
      }
    }
  }
}
const observer = new MutationObserver((list) => {
  if (!document.getElementById("totalPrice")) {
    var el = document.createElement("div");
    el.id = "totalPrice";
    if ($('*[data-test-id="miniBagSubTotal"]')[0]) {
      $('*[data-test-id="miniBagSubTotal"]')[0].after(el);
    }
  }
  if (localStorage.getItem("convert") == "true") {
    applyChanges();
    checkLimit();
  }
});
observer.observe(document.body, {
  attributes: true,
  childList: true,
  subtree: true,
});

// perform any DOM change action in your page. e.g. show/hide
function checkLimit() {
  if (!pricesNew) {
    return;
  }
  let updated = pricesNew.filter(function (price) {
    if (price.innerText.length < 20) {
      if (price.innerText.includes("ILS")) {
        return price;
      }
    }
  });
  if (document.getElementById("totalPrice")) {
    cartValue = parseFloat(
      document.getElementById("totalPrice").innerText.match(/(\d+)/)[0]
    );
  } else {
    cartValue = 0;
  }
  updated.map((price) => {
    currentPrice = parseFloat(price.innerText.match(/(\d+)/)[0]);
    cartValue = cartValue ? cartValue : 0;
    if (cartValue + currentPrice < limit) {
      let vTick = "✅";
      if (
        price.childElementCount == 1 &&
        !price.innerHTML.includes("✅") &&
        !Array.from(price.classList).includes("_1swt2Qk")
      ) {
        price.innerHTML += vTick;
      }
    }
    if (cartValue + currentPrice > limit && price.innerHTML.includes("✅")) {
      price.innerHTML = price.innerHTML.replace("✅", "");
    }
  });
}
function getRubleRate() {
  fetch("https://open.er-api.com/v6/latest/ILS")
    .then((response) => response.json())
    .then(function (data) {
      localStorage.setItem("rubleRate", data.rates.RUB);
    });
}
function getRubleRateUsd() {
  fetch("https://open.er-api.com/v6/latest/USD")
    .then((response) => response.json())
    .then(function (data) {
      localStorage.setItem("rubleRateUSD", data.rates.RUB);
    });
}
function setLimit() {
  if (limit) {
    return;
  }
  fetch("https://open.er-api.com/v6/latest/USD")
    .then((response) => response.json())
    .then(function (data) {
      limit = currency == "ILS" ? 73.5 * data.rates.ILS : 74;
    });
  checkLimit();
}

function getCookie() {
  var dc = document.cookie;
  var prefix = "browseCurrency=";
  var begin = dc.indexOf("; " + prefix);
  if (begin == -1) {
    begin = dc.indexOf(prefix);
    if (begin != 0) return null;
  } else {
    begin += 2;
    var end = document.cookie.indexOf(";", begin);
    if (end == -1) {
      end = dc.length;
    }
  }
  // because unescape has been deprecated, replaced with decodeURI
  //return unescape(dc.substring(begin + prefix.length, end));
  return decodeURI(dc.substring(begin + prefix.length, end));
}

function checkCurrency() {
  var myCookie = getCookie();

  if (myCookie == null || myCookie != "RUB") {
    // do cookie doesn't exist stuff;
    let blurredArea = document.getElementById("chrome-main-content");
    blurredArea.style.filter = "blur(17px)";
    //?browseCountry=TR&browseCurrency=RUB;
    addElement();
  } else {
    // do cookie exists stuff
    proceed = true;
  }
}

function addElement() {
  // create a new div element
  var location = window.location.href;
  var newDiv = document.createElement("div");
  newDiv.style = `z-index: 1;
  position: fixed;
  margin: auto;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  height: 120px;
  text-align: center;
  background-color:white;
  padding:15px;
  border-radius:100px;
  -webkit-box-shadow: 0px 0px 9px -4px rgba(0,0,0,0.75);
  -moz-box-shadow: 0px 0px 9px -4px rgba(0,0,0,0.75);
  box-shadow: 0px 0px 22px -4px rgba(0,0,0,0.75);`;
  newDiv.id = "tempDiv";
  newDiv.innerHTML = `
  <button id="closeDiv" style="background-color: black;
  border: none;
  color: white;
  border-radius:10px;">x</button>
  <h2 style="margin:15px;">על מנת להמשיך יש לעבור לחנות טורקיה ומטבע רובל</h2>
  <button style="padding: 10px;
  border-radius: 50px;
  margin-bottom:10px;
  border: none;
  outline:none;"
  onclick="location.href='?browseCountry=TR&browseCurrency=RUB'">למעבר</button>
  `;
  document.body.append(newDiv);
  document.getElementById("closeDiv").addEventListener("click", closeDiv);
}
function closeDiv() {
  document.getElementById("tempDiv").style.display = "none";
  document.getElementById("chrome-main-content").style.filter = "none";
}

// function checkRestrictions(itemId) {
//   fetch(
//     `https://asos2.p.rapidapi.com/products/detail?id=${itemId}&sizeSchema=US&store=US&lang=en-US&currency=USD`,
//     {
//       method: "GET",
//       headers: {
//         "x-rapidapi-key": "66a6c92e83msh6527ec33a15fcbcp1c9a16jsn77eb8f7ff918",
//         "x-rapidapi-host": "asos2.p.rapidapi.com",
//       },
//     }
//   )
//     .then((response) => {
//       response.json().then((data) => {
//         debugger;
//       });
//     })
//     .catch((err) => {
//       console.error(err);
//     });
// }
