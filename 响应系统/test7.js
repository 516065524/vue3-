const data = {foo: 1}

// 存储副作用函数的桶
const bucket = new WeakMap();

const obj = new Proxy(data, {
    get(target, key) {
        // 将副作用函数activeEffect添加到存储副作用函数的桶中
        track(target, key);
        // 返回属性值
        return target[key]
    },
    set(target, key, newVal) {
        // 设置属性值
        target[key] = newVal;
        // 把副作用函数从桶里取出来并执行
        trigger(target, key)
    }
})


function track (target, key) {
    // 没有activeEffect,直接return
    if (!activeEffect) return
    // 根据target从“桶”中取得depsMap, 它也是一个Map类型: key --> effects
    let depsMap = bucket.get(target)
    // 如果不存在depsMap,那么新建一个Map并与target关联
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    // 再根据key从depsMap中取得deps,它是一个Set类型
    // 里面存储着所有与当前key相关联的副作用函数: effects
    let deps = depsMap.get(key)
    // 如果deps不存在,同样新建一个Set并与key关联
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    // 最后将当前激活的副作用函数添加到“桶”里
    deps.add(activeEffect)
    // deps就是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到activeEffect.deps 数组中
    activeEffect.deps.push(deps)
}

function trigger (target, key) {
    // 根据target从桶中取得depsMap,它是: key --> effects
    const depsMap = bucket.get(target);
    if (!depsMap) return
    // 根据key取得所有副作用函数effects
    const effects = depsMap.get(key);
    // 执行副作用函数
    // effects && effects.forEach(fn => fn());

    const effectsToRun = new Set()
    effects && effects.forEach(effectFn => {
        
        // 如果trigger触发执行的副作用函数与当前正在执行的副作用函数相同,则不触发执行
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun.forEach(effectFn => {
        // 如果一个副作用函数存在调度器, 则调用该调度器, 并将副作用函数作为参数传递
        if (effectFn.optiopns.scheduler) { // 新增
            effectFn.optiopns.scheduler(effectFn) // 新增
        } else {
            // 否则直接执行副作用函数(之前的默认行为)
            effectFn()
        }
    })
}


let activeEffect

// effect栈
const effectStack = []


function effect(fn, optiopns = {}) {
    const effectFn = () => {
        // 调用cleanup函数完成清除工作
        cleanup(effectFn)
        // 当effectFn执行时,将其设置为当前激活的副作用函数
        activeEffect = effectFn

        // 在调用副作用函数之前将当前副作用函数压入栈中
        effectStack.push(effectFn)
        fn()
        // 在当前副作用函数执行完毕后,将当前副作用函数弹出栈,并把acticeEffect还原为之前的值
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1]
    }
    // 将options挂载到effectFn上
    effectFn.optiopns = optiopns
    // activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
    effectFn.deps = []
    // 执行副作用函数
    effectFn()
}

function cleanup (effectFn) {
    //遍历effectFn.deps数组
    for (let i = 0; i < effectFn.deps.length; i ++) {
        //deps是依赖集合
        const deps = effectFn.deps[i]
        // 将effectFn从依赖集合中移除
        deps.delete(effectFn)
    }
    // 最后需要重置effectFn.deps数组
    effectFn.deps.length = 0
}

// 定义一个任务队列
const jobQueue = new Set();
// 使用Promise.resolve()创建了一个Promise实例,我们用它将一个任务添加到微任务队列
const p = Promise.resolve();


// 一个标志代表是否在刷新队列
let isFlushing = false

function flushJob() {
    // 如果队列正在刷新,则什么都不做
    if (isFlushing) return;
    // 设置为true
    isFlushing = true;
    // 在微任务队列中刷新jobQueue队列
    p.then(() => {
        jobQueue.forEach(job => job())
    }).finally(() => {
        isFlushing = false
    })
}


effect(
    () => {
        console.log(obj.foo)
    },
    // options
    {
        scheduler(fn) {
            // ...
            // setTimeout(fn)
            jobQueue.add(fn)
            flushJob()
        }
    }
)

obj.foo++
obj.foo++

// console.log('结束了')