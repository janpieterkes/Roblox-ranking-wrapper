// This is a roblox API wrapper. It has some basic functions like promoting a user or ranking them to a specfic rank.

//Rank bot before launching
require('dotenv')
.config()
const importantData = {}
const axios = require('axios').default

async function getxcsrf() { // Get a session token by sending an http request to the auth api. This will return a response with an error, but it contains a sesstion token. This session token is returned. 
    try {

        if (!importantData.xcsrfToken || (Date.now()/1800) - importantData.xcsrfToken.time >= 1700) { // If a session token was already aquired and it has not been expired return that one instead of using http requests.
            let xcsrfRes = await axios({
                url : 'https://auth.roblox.com',
                method : 'post',
                headers : {
                    'Content-Type' : 'application/json',
                    "Cookie": ".ROBLOSECURITY=" + process.env.cookie
                }
            })
        } else {
            return importantData.xcsrfToken.token
        }

    } catch (err) {
        const token = err.response.headers.get('x-csrf-token')
        importantData.xcsrfToken = {time : Date.now(),token : token}
        return token
    }
}

async function convertRankId(groupId,rankNumber) { // This function converts a Roblox rankNumber into a rankId. The groupMember api doesn't accept rankNumber, but it's a pain for users to get a rankId number therefor this was added.
    try {
        let response = await axios({
            url : `https://groups.roblox.com/v1/groups/${groupId}/roles`,
            method : 'get',
            headers : {
                'Content-Type' : 'application/json'
            }
        })

        for (let groupObject of response.data.roles) { // Loop trough all group ranks and find the one with the matching rankNumber. If one is found return it, otherwise throw an error.
            if (groupObject.rank === rankNumber) {
                return groupObject.id
            }
        }

    const error = new Error('Rank does not exist in specified group.');
    throw error
    } catch (err) {
        logError(err) // Log the error in an error log discordTextChannel.
    }
}

async function logRankChange(userId,rankNumber,discordClient) { // Basic function that sends a message to a discordTextChannel on a rank change.
    try {
        const logsChannel = await discordClient.channels.fetch('1082497428403535872')
        logsChannel.send(
            {content : `${userId}'s rank was set to ${rankNumber}!`}
        )
    } catch (err) {
        console.log(err)
    }
}

async function logError(error) { // Basic function that sends a message to a discordTextChannel when an error is thrown.
    setTimeout(async () => {
    const logsChannel = await bot.channels.fetch('1082497428403535872')
    logsChannel.send(
        {content : `${error.toString()}`}
    )
    },1500)
}

module.exports = {
    async setRank(groupId,rankNumber,userId,discordClient) { // Export the functions that are actually useful.
        try {
            let xtoken = await getxcsrf() // Get a session token.
            let roleId = await convertRankId(groupId,rankNumber) // Get the rankId.
            await axios({
                url : `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`,
                method : 'patch',
                data : {roleId : `${roleId}`},
                headers : {
                    'X-CSRF-TOKEN' : `${xtoken}`,
                    "Cookie": '.ROBLOSECURITY=' + process.env.cookie
                }
            }) // Update the user's rank using a patch request.
    
            if (discordClient) { // If a bot was specified send a log message.
                logRankChange(userId,rankNumber,discordClient)
            }
    
        } catch (err) { // log any relevant errors that may occur.
            if (err.response.data.errors[0].message) {
                console.log(err.response.data.errors[0].message)
            } else {console.log(err)}
        }
    },

    async promotePlayer(groupId,userId) { // This function does practically the same as the setRank. It promotes them to the next rank in the specified group.
        try {
            let xtoken = await getxcsrf()
            let userRes = await axios({
                url : `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
                method : 'get'
            })

            let userRanks = userRes.data.data
            let currentRank
            for (const groupObject of userRanks) { // Find the users rank in the specfied group.
                if (groupObject.group.id === groupId) {
                    currentRank = groupObject.role.rank
                    break
                }
            }

            if (!currentRank || currentRank === 0) { // If the user rank is 0 it means they're not in the group, and therefor cannot be promoted.
                throw new Error(`User is not in group ${groupId}`)
            } else {console.log(currentRank)}

            let groupRes = await axios({
                url : `https://groups.roblox.com/v1/groups/${groupId}/roles`,
                method : 'get'
            })

            let rolesArray = groupRes.data.roles
            let rankIndex = rolesArray.findIndex((role) => role.rank === currentRank)
            rankIndex += 1 // Get the index of the rank in the array. This is needed to get the rankNumber.

            if (!rolesArray[rankIndex] || rankIndex >= 255) { // If a user has the max rank throw an error as they can't be promoted.
                throw new Error('User reached max rank')
            } else {console.log(rolesArray[rankIndex])}

            await this.setRank(groupId,rolesArray[rankIndex].rank,userId) // Actually update the user's rank.
            
        } catch (err) {console.log(err)} // Log all unexpected errors in the console.
    }
}