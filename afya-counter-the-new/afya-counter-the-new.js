/**
 * AFYA Counter The New by Marcin Chuć
 * e-mail: marcin ...change it to at... afya.pl
 * (C) 2019
 */

module.exports = function (RED) {
    const setMisconfiguredStatus = (node, message, timestamp) => {
        node.status({
            fill: "red",
            shape: "dot",
            text: `missconfigured - ${message} <${timeConvert(timestamp)}>`
        });
    };

    const updateStatus = (node, fill, shape, text) => {
        node.status({fill, shape, text});
    };

    function AFYACounterTheNew(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        const validateConfig = (now) => {
            const {countTime = 60000, minTimePeriod = 1000} = config;

            if (!config.variableName || config.variableName === -1) {
                setMisconfiguredStatus(node, "please edit this Node and set variableName", now);
                return false;
            }

            if (minTimePeriod > countTime) {
                setMisconfiguredStatus(node, "minTimePeriod is greater than countTime - make correction, please", now);
                return false;
            }

            if (minTimePeriod <= 0 || countTime <= 0) {
                setMisconfiguredStatus(node, "minTimePeriod and countTime must be greater than 0", now);
                return false;
            }

            return true;
        };

        node.on("input", function (msgIn) {
            const now = Date.now();
            if (!validateConfig(now)) return;

            const {variableName, countTime = 60000, minTimePeriod = 1000} = config;
            let myCounter =
                node.context().flow.get(variableName) || createInitialCounter();

            const command = String(msgIn.payload || "").toLowerCase();

            if (["kill", "destroy"].includes(command)) {
                handleKillDestroy(command, myCounter, now, variableName);
                return;
            }

            if (["reset", "resetcounter", "resetall", "addtime"].includes(command) && myCounter.resetSensitive) {
                handleResets(command, myCounter, countTime);
            }

            if (myCounter.timer !== undefined) return;

            startCounterLoop(myCounter, variableName, node, now);
        });

        const createInitialCounter = () => ({
            counter: 0,
            countTime: Math.abs(config.countTime) || 60000,
            minTimePeriod: Math.abs(config.minTimePeriod) || 1000,
            stopTime: Date.now() + (Math.abs(config.countTime) || 60000),
            variableName: config.variableName,
            resetSensitive: false,
        });

        const handleKillDestroy = (command, myCounter, now, variableName) => {
            myCounter.resetSensitive = false;
            myCounter.stopTime = now;

            if (command === "destroy") {
                node.context().flow.set(variableName, myCounter);
                deleteInterval(variableName, node);
                updateStatus("orange", "dot", `state: DESTROYED <${timeConvert(now)}>`);
            }
        };

        const handleResets = (command, myCounter, countTime) => {
            if (command === "addtime") {
                myCounter.stopTime += countTime;
            }
            if (command === "reset" || command === "resetall") {
                myCounter.stopTime = Date.now() + (Math.abs(config.countTime) || 60000);
            }
            if (command === "resetcounter" || command === "resetall") {
                myCounter.counter = 0;
            }
            myCounter.resetSensitive = true;
            node.context().flow.set(config.variableName, myCounter);
        };

        const startCounterLoop = (myCounter, variableName, node, now) => {
            myCounter.recallTime = myCounter.minTimePeriod;
            myCounter.resetSensitive = true;
            node.context().flow.set(variableName, myCounter);

            updateStatus(
                "blue",
                "ring",
                `state: STARTING... counter: ${myCounter.counter} ->; stop @ ${timeConvert(
                    myCounter.stopTime
                )} in ${(myCounter.stopTime - now) / 1000}s <${timeConvert(now)}>`
            );

            node.send(createMessage(myCounter, "counting"));

            myCounter.timer = setInterval(() => timeLoop(variableName, node), myCounter.recallTime);
        };

        const createMessage = (myCounter, state) => ({
            payload: {
                counter: myCounter.counter,
                stopTime: myCounter.stopTime,
                recallTime: myCounter.recallTime,
                countTime: myCounter.countTime,
                minTimePeriod: myCounter.minTimePeriod,
                timestamp: Date.now(),
                state,
            },
        });

        function timeLoop(variableName, childNode) {
            const now = Date.now();
            const myCounter = childNode.context().flow.get(variableName);
            myCounter.counter += 1;
            childNode.context().flow.set(variableName, myCounter);

            updateStatus(
                "green",
                "dot",
                `state: ACTIVE counter: ${myCounter.counter} ->; stop @ ${timeConvert(myCounter.stopTime)} in ${
                    (myCounter.stopTime - now) / 1000
                }s <${timeConvert(now)}>`
            );

            childNode.send(createMessage(myCounter, "counting"));

            if (myCounter.stopTime <= now) {
                childNode.send(createMessage(myCounter, "end"));
                setTimeout(() => childNode.send(createMessage(myCounter, "waiting")), 300);

                updateStatus(
                    "red",
                    "dot",
                    `state: STOP counter: ${myCounter.counter} <${timeConvert(now)}>`
                );

                deleteInterval(variableName, childNode);
            }
        }

        function deleteInterval(variableName, childNode) {
            const myCounter = childNode.context().flow.get(variableName);

            if (myCounter?.timer !== undefined) {
                clearInterval(myCounter.timer);
            }
            childNode.context().flow.set(variableName, undefined);
        }

        function timeConvert(myTimeStamp) {
            const d = new Date(myTimeStamp);

            const padZero = (num) => String(num).padStart(2, "0");

            return `${d.getFullYear()}/${padZero(d.getMonth() + 1)}/${padZero(d.getDate())} ${[
                padZero(d.getHours()),
                padZero(d.getMinutes()),
                padZero(d.getSeconds()),
            ].join(":")}`;
        }
    }

    RED.nodes.registerType("afya-counter-the-new", AFYACounterTheNew);
};
