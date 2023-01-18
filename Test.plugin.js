/**
 * @name Roblox-Discord-VC
 * @author Dawidooss
 * @description Skibidi łop łop łop jes jes jes jes
 * @version 0.0.1
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
        version: "0.0.1",
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

// buttonActive-Uc1jHx
let toggleButton = BdApi.DOM.parseHTML(`<button aria-expanded="false" aria-label="Start VC" type="button" class="button-1EGGcP buttonColor-3bP3fX button-f2h6uQ lookFilled-yCfaCM colorBrand-I6CyqQ sizeSmall-wU2dO- fullWidth-fJIsjq grow-2sR_-F button-1EGGcP" id="vc-button"><div class="contents-3ca1mk buttonContents-y1l-R8">VC
  </div></button>`)
let stopped = false

let defaultVolumes = {}
let active = false

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
    const UserStore  = WebpackModules.getByProps("getCurrentUser", "getUser")
    let intervalId

    const handleToggle = (state) => {
        active = state || !active
    
        if (active) {
            toggleButton.classList.add("buttonActive-Uc1jHx")
        } else {
            toggleButton.classList.remove("buttonActive-Uc1jHx")
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
            stopped = false
            const userId = UserStore.getCurrentUser().id

            const append = () => {
                if (stopped) return
                if (!document.getElementById("vc-button")) {
                    document.getElementsByClassName("actionButtons-2vEOUh")[0].append(toggleButton)
                }
            }

            append()
            BdApi.onRemoved(toggleButton, ()=>{
                append()
            })

            intervalId = setInterval(() => {
                try {
                    console.log(active)
                    if (!active) return
                    request.get("https://TremendousDizzyArtificialintelligence.dawidooss.repl.co/get?userId="+userId, (error, response, body) => {
                        if (!active) return
                        const json = JSON.parse(body)
                        console.log(body)
                        if (json.error) {console.warn(json.error); return}
                        for (let [userId, volume] of Object.entries(json)) {
                            if (!defaultVolumes[userId]) {
                                defaultVolumes[userId] = AudioConvert.amplitudeToPerceptual(MediaEngineStore.getLocalVolume(userId))
                            }
                            MediaEngineActions.setLocalVolume(userId, AudioConvert.perceptualToAmplitude(map(volume, 0,100, 0, defaultVolumes[userId])))
                        }
                    })
                } catch(error) {

                }
            }, 100)
        }
        onStop() {
            clearInterval(intervalId);
            console.log('remove')
            // if (document.getElementById("vc-button")) {
                stopped = true
                handleToggle(false)
                try {document.getElementById("vc-button").remove()} catch(e) {}
                for ([userId, volume] of Object.entries(defaultVolumes)) {
                    MediaEngineActions.setLocalVolume(userId, AudioConvert.perceptualToAmplitude(volume))
                }
            // }
            
        }

        patch() { }

    }

    return plugin;
})(global.ZeresPluginLibrary.buildPlugin(config));
