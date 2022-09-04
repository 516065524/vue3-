// 存储副作用函数的桶
const bucket = new WeakMap();

// let data = { ok: true, text: 'hello world' }
let data = { foo: true, bar: true }




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

    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effectFn => effectFn())
}


let activeEffect


function effect(fn) {
    const effectFn = () => {
        // 调用cleanup函数完成清除工作
        cleanup(effectFn)
        // 当effectFn执行时,将其设置为当前激活的副作用函数
        activeEffect = effectFn
        fn()
    }
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




// effect(() => {
//     console.log('111')
//     console.log(obj.ok ? obj.text : 'not')
// })

// setTimeout(() => {
//     obj.ok = false
//     setTimeout(() => {
//         obj.text = 'hello vue3'
//     }, 1000)
// },1000)

let temp1, temp2


effect(function effectFn1 () {
    console.log('effectFn1 执行')
    effect(function effectFn2 () {
        console.log('effectFn2 执行')
        temp2 = obj.bar
    })

    temp1 = obj.foo
})

// const set = new Set([1])

// set.forEach(item => {
//     set.delete(1)
//     set.add(1)
//     console.log('遍历中')
// })