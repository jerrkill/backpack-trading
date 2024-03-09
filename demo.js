"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backpack_client_1 = require("./backpack_client");
require('dotenv').config()

/// EDIT HERE ///
const API_KEY = process.env.API_KEY
const API_SECRET = process.env.API_SECRET
const SYMBOL_PAIR = process.env.SYMBOL_PAIR
/////////////


const demo = async (client) => {
    // let price = 104.38
    // let orderResultBid = await client.ExecuteOrder({
    //     orderType: "Limit",
    //     price: price.toString(),
    //     quantity: 1,
    //     side: "Bid",
    //     symbol: "SOL_USDC",
    //     // timeInForce: "IOC"
    // })
    // console.log(orderResultBid) Ticker
    // let orderResult = await client.Ticker({symbol: "JUP_USDC"});

    let orderResult = await client.FillHistory({symbol: "JUP_USDC", orderId: '112058989772734464', limit: 10 });
    // try {
    //     // let orderResult = await client.GetOrder({symbol: "JUP_USDC", orderId: '112058989772734464' });
    // }catch(error) {
    //     console.log(error.message)
    //     if (error.message == 'Response code 404 (Not Found)') {
    //         console.log(error.code)
    //     }
    // }
    // let orderResult = await client.FillHistory({symbol: "JUP_USDC", orderId: '112059004175384576' });
    console.log(orderResult)
}


(async () => {
    const apisecret = API_SECRET;
    const apikey = API_KEY;
    const client = new backpack_client_1.BackpackClient(apisecret, apikey);
    demo(client)
})()