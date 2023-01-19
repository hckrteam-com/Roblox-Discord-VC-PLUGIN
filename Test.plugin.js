/**
 * @name Roblox-Discord-VC
 * @author Dawidooss
 * @description Skibidi łop łop łop jes jes jes jes
 * @version 0.1
 */

const request = require("request");
const fs = require("fs");
const path = require("path");

const config = {
    info: {
        name: "Roblox-Discord-VC",
        authors: [
            {
                name: "Dawidooss"
            }
        ],
        version: "0.1",
        description: "Skibidi łop łop łop jes jes jes jes",
        github_raw: "",
    },
    changelog: [],
    defaultConfig: []
};

const bySource = (...fragments) => {
    return (target) => {
        if (target instanceof Function) {
            const source = target.toString();
            const renderSource = target.prototype?.render?.toString();
            return fragments.every((fragment) => (typeof fragment === "string" ? (source.includes(fragment) || renderSource?.includes(fragment)) : (fragment(source) || renderSource && fragment(renderSource))));
        }
        else if (target instanceof Object && "$$typeof" in target) {
            const source = (target.render ?? target.type)?.toString();
            return source && fragments.every((fragment) => typeof fragment === "string" ? source.includes(fragment) : fragment(source));
        }
        else {
            return false;
        }
    };
};


const mappedProxy = (target, mapping) => {
    const map = new Map(Object.entries(mapping));
    return new Proxy(target, {
        get(target, prop) {
            return target[map.get(prop) ?? prop];
        },
        set(target, prop, value) {
            target[map.get(prop) ?? prop] = value;
            return true;
        },
        deleteProperty(target, prop) {
            delete target[map.get(prop) ?? prop];
            return true;
        },
        has(target, prop) {
            return map.has(prop) || prop in target;
        },
        ownKeys() {
            return [...map.keys(), ...Object.keys(target)];
        },
        getOwnPropertyDescriptor(target, prop) {
            return Object.getOwnPropertyDescriptor(target, map.get(prop) ?? prop);
        },
        defineProperty(target, prop, attributes) {
            Object.defineProperty(target, map.get(prop) ?? prop, attributes);
            return true;
        }
    });
};

const demangle = (mapping, required, proxy = false) => {
    const req = required ?? Object.keys(mapping);
    const found = find((target) => (target instanceof Object
        && target !== window
        && req.every((req) => Object.values(target).some((value) => mapping[req](value)))));
    return proxy ? mappedProxy(found, Object.fromEntries(Object.entries(mapping).map(([key, filter]) => [
        key,
        Object.entries(found ?? {}).find(([, value]) => filter(value))?.[0]
    ]))) : Object.fromEntries(Object.entries(mapping).map(([key, filter]) => [
        key,
        Object.values(found ?? {}).find((value) => filter(value))
    ]));
};

const find = (filter, { resolve = true, entries = false } = {}) => BdApi.Webpack.getModule(filter, {
    defaultExport: resolve,
    searchExports: entries
});

const AudioConvert = demangle({
    amplitudeToPerceptual: bySource("Math.log10"),
    perceptualToAmplitude: bySource("Math.pow(10")
});

const map = (x, in_min, in_max, out_min, out_max) => {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


let toggleButton = BdApi.DOM.parseHTML(`<button aria-expanded="false" aria-label="Start VC" type="button" class="button-1EGGcP buttonColor-3bP3fX button-f2h6uQ lookFilled-yCfaCM colorBrand-I6CyqQ sizeSmall-wU2dO- fullWidth-fJIsjq grow-2sR_-F button-1EGGcP" id="vc-button"><div id="vc-button2" class="contents-3ca1mk buttonContents-y1l-R8">VC</div></button>`)
let stopped = false

let defaultVolumes = {}
let active = false
let previousVoiceChannel

const IC_CHANNEL_ID = "1065384232823832656"

module.exports = !global.ZeresPluginLibrary ? class {
    constructor() {
        this._config = config;
    }

    load() {
        BdApi.showConfirmationModal("Library plugin is needed",
            `The library plugin needed for AQWERT'sPluginBuilder is missing. Please click Download Now to install it.`, {
            confirmText: "Download",
            cancelText: "Cancel",
            onConfirm: () => {
                request.get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", (error, response, body) => {
                    if (error)
                        return electron.shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");

                    fs.writeFileSync(path.join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body);
                });
            }
        });
    }

    start() { }

    stop() { }
} : (([Plugin, Library]) => {
    const { DiscordModules, WebpackModules, DOMTools, ReactTools } = Library;
    // const { UserStore } = DiscordModules;
    const MediaEngineActions = WebpackModules.getByProps("setLocalVolume")
    const MediaEngineStore = WebpackModules.getByProps("getLocalVolume")

    const ChannelActions = WebpackModules.getByProps("selectChannel")
    const UserStore  = WebpackModules.getByProps("getCurrentUser", "getUser")
    const SelectedChannelStore = WebpackModules.getByProps("getLastSelectedChannelId")

    const ChannelStore = WebpackModules.getByProps("getChannel", "getDMFromUserId")
    const GuildChannelsStore = WebpackModules.getByProps("getChannels", "getDefaultChannel")
    const PrivateChannelActions = WebpackModules.getByProps("openPrivateChannel")
    const GuildMemberStore = WebpackModules.getByProps("getMember")
    let intervalId

    const getUsersByNames = (names) => {
        // display names
        let list = GuildMemberStore.getMembers("796699774563647508").filter(user => {
            return names.find(name => {return name == user.nick})
        })

        // real names
        for (user of UserStore.filter(user => {return names.find(name => {return user.username == name})})) {
            list.push(user)
        }
        return list
        
    }
    const getUserIdsInVC = (channel) => {
        let namesToQuery = []
        for (let e of channel.getElementsByClassName("username-vAneIW")) {
            namesToQuery.push(e.innerText)
        }
        let userIds = []
        for (let user of getUsersByNames(namesToQuery)) {
            userIds.push(user.userId || user.id)
        }
        return userIds
    }

    const handleToggle = (state, skipChangeChannel) => {
        const previousActive = active
        active = state == undefined ? !active : state
    
        if (active) {
            previousVoiceChannel = SelectedChannelStore.getVoiceChannelId()
            ChannelActions.selectVoiceChannel(IC_CHANNEL_ID)
            toggleButton.classList.add("buttonActive-Uc1jHx")
            // toggleButton.innerHTML = `<div id="vc-button2" class="contents-3ca1mk buttonContents-y1l-R8"><svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.99 11C14.99 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5L14.99 11ZM12 16.1C14.76 16.1 17.3 14 17.3 11H19C19 14.42 16.28 17.24 13 17.72V21H11V17.72C7.72 17.23 5 14.41 5 11H6.7C6.7 14 9.24 16.1 12 16.1ZM12 4C11.2 4 11 4.66667 11 5V11C11 11.3333 11.2 12 12 12C12.8 12 13 11.3333 13 11V5C13 4.66667 12.8 4 12 4Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14.99 11C14.99 12.66 13.66 14 12 14C10.34 14 9 12.66 9 11V5C9 3.34 10.34 2 12 2C13.66 2 15 3.34 15 5L14.99 11ZM12 16.1C14.76 16.1 17.3 14 17.3 11H19C19 14.42 16.28 17.24 13 17.72V22H11V17.72C7.72 17.23 5 14.41 5 11H6.7C6.7 14 9.24 16.1 12 16.1Z" fill="currentColor"></path></svg></div>`
        } else {
            if (!skipChangeChannel) {
                if (previousVoiceChannel) {
                    ChannelActions.selectVoiceChannel(previousVoiceChannel)
                } 
            } else if (previousActive) {
                ChannelActions.disconnect()
            }
            toggleButton.classList.remove("buttonActive-Uc1jHx")
            // toggleButton.innerHTML = `<div id="vc-butto/n2" class="contents-3ca1mk buttonContents-y1l-R8"><svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path d="M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11Z" fill="currentColor"></path><path d="M9.01 11.085C9.015 11.1125 9.02 11.14 9.02 11.17L15 5.18V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 11.03 9.005 11.0575 9.01 11.085Z" fill="currentColor"></path><path d="M11.7237 16.0927L10.9632 16.8531L10.2533 17.5688C10.4978 17.633 10.747 17.6839 11 17.72V22H13V17.72C16.28 17.23 19 14.41 19 11H17.3C17.3 14 14.76 16.1 12 16.1C11.9076 16.1 11.8155 16.0975 11.7237 16.0927Z" fill="currentColor"></path><path d="M21 4.27L19.73 3L3 19.73L4.27 21L8.46 16.82L9.69 15.58L11.35 13.92L14.99 10.28L21 4.27Z" class="strikethrough-2Kl6HF" fill="currentColor"></path></svg></div>`
            for ([userId, volume] of Object.entries(defaultVolumes)) {
                MediaEngineActions.setLocalVolume(userId, AudioConvert.perceptualToAmplitude(volume))
            }
        }
    }

    toggleButton.addEventListener('click', () => {handleToggle()})

    class plugin extends Plugin {
        constructor() {
            super();
        }
        onStart() {

            const IC_CHANNEL = document.querySelector(`.content-2a4AW9 > li[data-dnd-name="${ChannelStore.getChannel(IC_CHANNEL_ID).name}"]`)


            stopped = false
            const currentUserId = UserStore.getCurrentUser().id
            previousVoiceChannel = SelectedChannelStore.getVoiceChannelId()

            const wrapper = document.querySelector(".wrapper-3Hk9OB")
            let previousWrapperChildrenCount = 0

            const append = () => {
                if (stopped) return
                if (!document.getElementById("vc-button")) {
                    document.getElementsByClassName("actionButtons-2vEOUh")[0].append(toggleButton)
                }
            }
            
            handleToggle(false, true)

            intervalId = setInterval(() => {
                try {
                    // if not in VC, wrapper children will be 0, wait till joins, so it changes to 1 and then append the button
                    if (previousWrapperChildrenCount == 0 && wrapper.children.length == 1) {
                        append()
                    }
                    previousWrapperChildrenCount = wrapper.children.length

                    if (!active) {
                        if (SelectedChannelStore.getVoiceChannelId() == IC_CHANNEL_ID) {
                            handleToggle(true)
                        }
                        return
                    }

                    // check if has left VC
                    if (SelectedChannelStore.getVoiceChannelId() != IC_CHANNEL_ID) {
                        previousVoiceChannel = SelectedChannelStore.getVoiceChannelId()
                        handleToggle(false)
                    }

                    request.get("https://Roblox-Discord-VC-API.dawidooss.repl.co/get?userId="+currentUserId, (error, response, body) => {
                        if (!active) return
                        const json = JSON.parse(body)
                        if (json.error) {console.warn(json.error); return}
                        let usersInVC = getUserIdsInVC(IC_CHANNEL)

                        for (let [userId, volume] of Object.entries(json)) {
                            if (!defaultVolumes[userId]) {
                                defaultVolumes[userId] = AudioConvert.amplitudeToPerceptual(MediaEngineStore.getLocalVolume(userId))
                            }
                            MediaEngineActions.setLocalVolume(userId, AudioConvert.perceptualToAmplitude(map(volume, 0,100, 0, defaultVolumes[userId])))
                        }

                        for (let userId of usersInVC) {
                            if (!Object.keys(json).find(e => {return userId == e})) {
                                MediaEngineActions.setLocalVolume(userId, 0)
                            }
                        }
                    })
                } catch(error) {}
            }, 100)
        }
        onStop() {
            clearInterval(intervalId);
            console.log('remove')
            stopped = true
            handleToggle(false, true)
            try {document.getElementById("vc-button").remove()} catch(e) {}
            for ([userId, volume] of Object.entries(defaultVolumes)) {
                MediaEngineActions.setLocalVolume(userId, AudioConvert.perceptualToAmplitude(volume))
            }
            
        }

        patch() { }

    }

    return plugin;
})(global.ZeresPluginLibrary.buildPlugin(config));