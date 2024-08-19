//Rank bot before trying
import dotenv from 'dotenv'
dotenv.config()
import fetch from "node-fetch";
import {bot} from './bot.js'

async function getxcsrf() {
    try {
        let xcsrfRes = await fetch('https://auth.roblox.com',{
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json',
                "Cookie": ".ROBLOSECURITY=" + process.env.cookie
            }
        })
        return xcsrfRes.headers.get('x-csrf-token')
    } catch (err) {
        console.log(err)
        logError(err)
    }
}

async function convertRankId(groupId,rankNumber) {
    try {
        let response = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/roles`)
    let data = await response.json()

    for (let groupObject of data.roles) {
        if (groupObject.rank === rankNumber) {
            return groupObject.id
        }
    }

    const error = new Error('Rank does not exist in specified group.');
    throw error
    } catch (err) {
        logError(err)
    }
}

async function logRankChange(userId,rankNumber) {
    try {
        const logsChannel = await bot.channels.fetch('1082497428403535872')
        logsChannel.send(
            {content : `${userId}'s rank was set to ${rankNumber}!`}
            )
    } catch (err) {
        console.log(err)
    }
}

async function logError(error) {
    setTimeout(async () => {
    const logsChannel = await bot.channels.fetch('1082497428403535872')
    logsChannel.send(
        {content : `${error.toString()}`}
    )
    },1500)
}

export async function setRank(groupId,rankNumber,userId) {
    try {
        let xtoken = await getxcsrf()
        let roleId = await convertRankId(groupId,rankNumber)
        let rankRes = await fetch(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`,{
            method : 'PATCH',
            body : JSON.stringify({roleId : `${roleId}`}),
            headers : {
                'X-CSRF-TOKEN' : `${xtoken}`,
                "Cookie": ".ROBLOSECURITY=" + process.env.cookie
            }
        })

        if (rankRes.status != 200) {
            let errorMessage = (await rankRes.json()).errors[0].message
            throw new Error(errorMessage)
        }

        logRankChange(userId,rankNumber)

    } catch (err) {
        console.log(err)
    }
}

setRank(9446101,251,3546043699)