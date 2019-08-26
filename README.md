# vue-request

> 封装axios请求，api统一管理，错误提示，断网处理等

在vue项目中，和后台交互获取数据这块，我们通常使用的是axios库，它是基于promise的http库，可运行在浏览器端和node.js中。他有很多优秀的特性，例如拦截请求和响应、取消请求、转换json、客户端防御XSRF等。

### 1. 安装插件

```
yarn add axios vant
```

### 2. 封装axios
在src目录下新建utils文件夹，在里面新建http.js文件

```
// http.js
import axios from 'axios'
import router from '../router'
// import QS from 'qs' // 序列化post类型的数据
import { Toast } from 'vant'
import store from '@/store/index'

/**
 * 提示函数
 * 禁止点击蒙层、显示一秒后关闭
 */

const tip = msg => {
    Toast({
        message: msg,
        duration: 1000,
        forbidClick: true
    })
}

/*
*跳转登录页
* 携带当前页面路由，以期在登录页面完成登录后返回当前页面

*/

const toLogin = () => {
    router.replace({
        path: '/login',
        query: {
            redirect: router.currentRoute.fullPath
        }
    })
}

/** 
 * 请求失败后的错误统一处理 
 * @param {Number} status 请求失败的状态码
 */

const errorHandle = (status, other) => {
    // 状态码判断
    switch (status) {
        case 401:
            toLogin();
            break;
        case 403:
            tip('登录过期，请重新登录');
            localStorage.removeItem('token');
            store.commit('loginSuccess', null);
            setTimeout(() => { toLogin() }, 1000);
            break;
        case 404:
            tip('请求的资源不存在');
            break;
        default: console.log(other)
    }
}

// 创建axios实例

const http = axios.create({
    baseURL: 'http://localhost:9000/admin/api',
    timeout: 1000 * 12
})

// post请求头
http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';

// 请求拦截器
http.interceptors.request.use(
    config => {
        /* 每次发送请求之前判断vuex中是否存在token
         *  如果存在，则统一在http请求的header都加上token，这样后台根据token判断你的登录情况
         *  即使本地存在token，也有可能token是过期的，所以在响应拦截器中要对返回状态进行判断
        */

        const token = store.state.token;
        token && (config.headers.Authorization = token);
        return config;

    },
    error => {
        return Promise.error(error);
    }
)

// 响应拦截器
http.interceptors.response.use(

    // 如果返回的状态码诶200，说明接口请求成功，可以正常拿到数据
    // 否则的话抛出错误
    res => res.status === 200 ? Promise.resolve(res) : Promise.reject(res),

    /*
        * 服务器状态码不是2开头的情况
        * 这里可以跟你们的后台开发人员协商好统一的错误状态码
        * 然后根据返回的状态码进行一些操作，例如登录过期提示，错误提示等
        * 下面列举几个常见的操作，其他需求可自行扩展
    */
    error => {
        if(response) {
              // 请求已发出，但是不在2xx的范围
        errorHandle(response.status, response.data.message);
        return Promise.reject(response)
        } else {
            // 处理断网情况
            // eg: 请求超时或断网时，更新state的network状态
            // network状态在app.vue中控制着一个全局的断网提示组件的显示隐藏
            // 关于断网组件中的刷新重新获取数据，会在断网组件中说明
            if(!window.navigator.onLine) {
                store.commit( 'changeNetwork', false);
            } else {
                return Promise.reject(error);
            }
        }
      
    
    }
)

export default http;



```

### 3. 封装api接口，统一管理
在src目录下新建api文件夹，在里面分别创建index.js、base.js、article.js文件

#### index.js

```
/** 
 * api接口的统一出口
 */
// 文章模块接口
import article from '@/api/article';
// 其他模块的接口……

// 导出接口
export default {
    article,
    // ……
}

```

#### base.js

```
/**
 * 接口域名的管理
 */
const base = {    
    sq: 'https://xxxx111111.com/api/v1',    
    bd: 'http://xxxxx22222.com/api'
}

export default base;
```


#### article.js

```
/**
 * article模块接口列表
 */

import base from './base'; // 导入接口域名列表
import axios from '@/utils/http'; // 导入http中创建的axios实例
import qs from 'qs'; // 根据需求是否导入qs模块

const article = {    
    // 新闻列表    
    articleList () {        
        return axios.get(`${base.sq}/topics`);    
    },    
    // 新闻详情,演示    
    articleDetail (id, params) {        
        return axios.get(`${base.sq}/topic/${id}`, {            
            params: params        
        });    
    },
    // post提交    
    login (params) {        
        return axios.post(`${base.sq}/accesstoken`, qs.stringify(params));    
    }
    // 其他接口…………
}

export default article;

```


### 4. 如何使用

#### 在src目录下main.js文件中引入

```
import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import api from './api'
Vue.prototype.$api = api; // 将api挂载到vue的原型上
Vue.config.productionTip = false;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");

```

#### 在页面中使用


```
methods: {    
    onLoad(id) {      
        this.$api.article.articleDetail(id, {        
            api: 123      
        }).then(res=> {
            // 执行某些操作      
        })    
    }  
}

```


#### 断网情况处理
修改App.vue

```
<template>  
    <div id="app">    
        <div v-if="!network">      
            <h3>我没网了</h3>      
            <div @click="onRefresh">刷新</div>      
        </div>    
        <router-view/>      
    </div>
</template>

<script>
    import { mapState } from 'vuex';
    export default {  
        name: 'App',  
        computed: {    
            ...mapState(['network'])  
        },  
        methods: {    
            // 通过跳转一个空页面再返回的方式来实现刷新当前页面数据的目的
            onRefresh () {      
                this.$router.replace('/refresh')    
            }  
        }
    }
</script>

```

## Project setup
```
git clone https://github.com/dobeco/vue-request.git
yarn install
```

### Compiles and hot-reloads for development
```
yarn run serve
```

### Compiles and minifies for production
```
yarn run build
```

### Run your tests
```
yarn run test
```

### Lints and fixes files
```
yarn run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
