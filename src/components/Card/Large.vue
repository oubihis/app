<template>
    <Card class="large-card">
        <div v-if="title" class="space-between pad-right">
            <CardHeader >{{ title }}</CardHeader>
             <!-- Add badges here in future -->
            <slot/>
        </div>
        <InteractionMenu v-if="menu" class="top-right"
            :menu="menu"
        />

        <!-- User block -->
        <User v-bind="user" :published="published"/>
        <!-- Content block and user interaction -->
        <div class="content">
            <Vote v-bind="vote" />
            <p>{{ body }}</p>
        </div>
    </Card>
</template>

<script>
import Card from '.'
import CardHeader from './Header'
import User from '@/components/User/Summary'
import Vote from '@/components/Vote'
import InteractionMenu from '@/components/Interactions/Menu'

export default {
  components: {
    Card,
    CardHeader,
    User,
    Vote,
    InteractionMenu
  },
  props: {
    /* post title */
    title: String,
    /* post body */
    body: String,
    /* post vote object, verify at lower level */
    vote: Object,
    /* user object, verify at lower level */
    user: Object,
    /* Date string */
    published: String,
    /* array of interactions */
    menu: Array
  }
}
</script>

<style scoped>
.large-card {
    margin-bottom: 10px;
}

.content {
    display: grid;
    grid-template-columns: 45px auto;
    grid-gap: 10px;
}

.space-between {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
}

.pad-right {
    padding-right: 10px;
}

p {
    margin: 10px 0;
    padding: 5px;
    white-space: pre-wrap;
}

.top-right {
    top: 12px;
    right: 0;
}

@media screen and (max-width: 600px) {
    .space-between {
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        margin-bottom: 10px;
    }
}
</style>
