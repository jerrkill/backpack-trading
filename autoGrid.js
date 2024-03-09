"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backpack_client_1 = require("./backpack_client");
const fs = require('fs');
require('dotenv').config()

/// EDIT HERE ///
const API_KEY = process.env.API_KEY
const API_SECRET = process.env.API_SECRET
const SYMBOL_PAIR = process.env.SYMBOL_PAIR
const GRID_CENTER_PRICE = process.env.GRID_CENTER_PRICE
const NUMBER_OF_GRIDS = process.env.NUMBER_OF_GRIDS
const CAPITAL_PER_GRID = process.env.CAPITAL_PER_GRID
const PRICE_DECIMAL = process.env.PRICE_DECIMAL
const QTY_DECIMAL = process.env.QTY_DECIMAL
/////////////

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function getNowFormatDate() {
    var date = new Date();
    var seperator1 = "-";
    var seperator2 = ":";
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var strHour = date.getHours();
    var strMinute = date.getMinutes();
    var strSecond = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (strHour >= 0 && strHour <= 9) {
        strHour = "0" + strHour;
    }
    if (strMinute >= 0 && strMinute <= 9) {
        strMinute = "0" + strMinute;
    }
    if (strSecond >= 0 && strSecond <= 9) {
        strSecond = "0" + strSecond;
    }
    var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
        + " " + strHour + seperator2 + strMinute
        + seperator2 + strSecond;
    return currentdate;
}

// 假设这些是API调用的模拟
async function place_buy_order(client, price, qty) {
        // console.log(getNowFormatDate(), "Price of JUP_usdc:", lastPrice);
        let quantitys = qty
        // let quantitys = (value / price).toFixed(2).toString();
        console.log(getNowFormatDate(), `PLACE buy order ... ${quantitys}`);
    let orderResultBid = await client.ExecuteOrder({
            orderType: "Limit",
            price: price.toString(),
            quantity: quantitys,
            side: "Bid",
            symbol: SYMBOL_PAIR,
            // timeInForce: "IOC"
        })
        // console.log(orderResultBid)
        return orderResultBid.id
}

async function place_sell_order(client, price, qty) {
        // let quantitys = (value / price).toFixed(2).toString();
        let quantitys = qty
    console.log(getNowFormatDate(), `PLACE sell order ... ${quantitys}`);
    let orderResultBid = await client.ExecuteOrder({
            orderType: "Limit",
            price: price.toString(),
            quantity: quantitys,
            side: "Ask",
            symbol: SYMBOL_PAIR,
            // timeInForce: "IOC"
        })
        // console.log(orderResultBid)
        return orderResultBid.id
}

async function get_order_filled(client,order_id) {
    // let orderResultBid = await client.GetOrder({numTry:1, symbol: SYMBOL_PAIR, orderId: order_id.toString() });
    let tmpQty = 0
    let side = null
    let orderResult = await client.FillHistory({symbol: SYMBOL_PAIR, orderId: order_id });
    // console.log(orderResult)
    if (orderResult.length>0) {
        side = orderResult[0].side
        tmpQty = orderResult.reduce((acc, trade) => acc + Number(trade.quantity), 0);
    }
    return {qty:tmpQty, side}
}

async function get_order_filled_v2(client, order_id) {
    if (!order_id) {
        return false
    }
    try {
        let orderResult = await client.GetOrder({symbol: SYMBOL_PAIR, orderId: order_id });
    }catch(error) {
        if (error.message == 'Response code 404 (Not Found)') {
            return true
        }
    }
    return false
}

// 定义网格类
class Grid {
    constructor(id, price, tp_price, value, qty) {
        this.id = id;
        this.price = price;
        this.tp_price = tp_price;
        this.value = value;
        this.qty = qty;
        this.order_id = null; // 初始时没有订单ID
        this.order_side = null
    }

    // 保存网格状态到文件
    save() {
        // 将网格信息转换为字符串
        const gridData = JSON.stringify(this);
        fs.writeFileSync(`cache/grid_${this.id}.json`, gridData);
    }

    // 从文件加载网格状态
    static load(id) {
        try {
            const gridData = fs.readFileSync(`cache/grid_${id}.json`);
        const gridObj = JSON.parse(gridData);
        const grid = new Grid(gridObj.id, gridObj.price, gridObj.tp_price, gridObj.value, gridObj.qty);
        grid.order_id = gridObj.order_id;
        grid.order_side = gridObj.order_side;
        return grid;
        } catch(error) {
            return false
        }
    }
}

// 计算并初始化网格，profitPerGrid现在是百分比
function initializeGrids(gridCenterPrice, profitPerGridPercentage, numberOfGrids, capitalPerGrid) {
    let grids = [];
    let halfNumberOfGrids = Math.floor(numberOfGrids / 2);
    for (let i = -halfNumberOfGrids; i <= halfNumberOfGrids; i++) {
        let gridId = i + halfNumberOfGrids;
        let loadedGrid = Grid.load(gridId);
        if (loadedGrid) {
            grids.push(loadedGrid);
        } else {
            let profitMultiplier = 1 + (profitPerGridPercentage / 100);
            let gridPrice = gridCenterPrice * Math.pow(profitMultiplier, i);
            let tpPrice = gridPrice * profitMultiplier;
            let qty = (capitalPerGrid/gridPrice).toFixed(QTY_DECIMAL).toString()
            let grid = new Grid(gridId, gridPrice.toFixed(PRICE_DECIMAL), tpPrice.toFixed(PRICE_DECIMAL), capitalPerGrid, qty);
            grids.push(grid);
            grid.save(); // 保存新计算的网格状态
        }
    }
    return grids;
}

// 管理单个网格
async function manage_grid(client,grid, ticker) {
    try {
        console.log(getNowFormatDate(),`process grid ${grid.id}:`+JSON.stringify(grid))
            // 如果没有挂单
        if (!grid.order_id) {
            // 检查价格
            if (1.05*parseFloat(ticker['lastPrice']) >= grid.price) {
                grid.order_id = await place_buy_order(client,grid.price, grid.qty);
                grid.order_side = 'Bid'
                grid.save();
            }
            
        } else {
            const lastPrice = parseFloat(ticker['lastPrice'])
            const conditionMax = 1.04*lastPrice
            const conditionMin = 0.96*lastPrice
            if (lastPrice >= conditionMin && lastPrice <= conditionMax) {
                let filled = await get_order_filled_v2(client, grid.order_id);
                console.log(getNowFormatDate(), `${grid.id} grid side:${grid.order_side} qty:${grid.qty}`);
                if (filled) {
                    if (grid.order_side == 'Bid') {
                        // 买单成交了 挂卖单
                        grid.order_id = await place_sell_order(client,grid.tp_price, grid.qty);
                        grid.order_side = 'Ask'
                        grid.save();
                    } else if(gride.order_side == 'Ask') {
                        // 买单成交了 挂买单
                        grid.order_id = await place_buy_order(client,grid.price, grid.qty);
                        grid.order_side = 'Bid'
                        grid.save();
                    }
                }
            }
            
        }
    // 如果订单正在进行中，不做任何操作
    } catch (e) {
        console.log(getNowFormatDate(), `${grid.id} grid error... (${e.message})`);
    }
}




// 假设这是一个周期性运行的函数
async function init(client, grids) {
    while (true) {
        const ticker = await client.Ticker({symbol: SYMBOL_PAIR});
        for (let grid of grids) {
            await manage_grid(client, grid, ticker);
            await sleep(40)
        }
        await sleep(1000*60)
    }
}



(async () => {
    const apisecret = API_SECRET;
    const apikey = API_KEY;
    const client = new backpack_client_1.BackpackClient(apisecret, apikey);
    const gridCenterPrice = GRID_CENTER_PRICE; // 网格中心价格
    const profitPerGridPercentage = 0.0850*4; // 每格利润百分比 不用动
    // const profitPerGridPercentage = 1; // 每格利润百分比
    const numberOfGrids = NUMBER_OF_GRIDS; // 网格数量
    const capitalPerGrid = CAPITAL_PER_GRID; // 每格资金
    const grids = initializeGrids(gridCenterPrice, profitPerGridPercentage, numberOfGrids, capitalPerGrid);
    init(client, grids);
})()
