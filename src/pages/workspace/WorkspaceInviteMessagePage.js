import React from 'react';
import PropTypes from 'prop-types';
import {Pressable, View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import Str from 'expensify-common/lib/str';
import lodashGet from 'lodash/get';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import ScreenWrapper from '../../components/ScreenWrapper';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import Navigation from '../../libs/Navigation/Navigation';
import styles from '../../styles/styles';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';
import * as Policy from '../../libs/actions/Policy';
import TextInput from '../../components/TextInput';
import MultipleAvatars from '../../components/MultipleAvatars';
import Avatar from '../../components/Avatar';
import * as OptionsListUtils from '../../libs/OptionsListUtils';
import CONST from '../../CONST';
import * as Link from '../../libs/actions/Link';
import Text from '../../components/Text';
import withPolicy, {policyPropTypes, policyDefaultProps} from './withPolicy';
import {withNetwork} from '../../components/OnyxProvider';
import networkPropTypes from '../../components/networkPropTypes';
import * as ReportUtils from '../../libs/ReportUtils';
import ROUTES from '../../ROUTES';
import * as Localize from '../../libs/Localize';
import Form from '../../components/Form';

const personalDetailsPropTypes = PropTypes.shape({
    /** The login of the person (either email or phone number) */
    login: PropTypes.string.isRequired,

    /** The URL of the person's avatar (there should already be a default avatar if
    the person doesn't have their own avatar uploaded yet) */
    avatar: PropTypes.string.isRequired,

    /** This is either the user's full name, or their login if full name is an empty string */
    displayName: PropTypes.string.isRequired,
});

const propTypes = {
    /** Beta features list */
    betas: PropTypes.arrayOf(PropTypes.string).isRequired,

    /** All of the personal details for everyone */
    personalDetails: PropTypes.objectOf(personalDetailsPropTypes).isRequired,

    invitedMembersDraft: PropTypes.arrayOf(PropTypes.string).isRequired,

    /** URL Route params */
    route: PropTypes.shape({
        /** Params from the URL path */
        params: PropTypes.shape({
            /** policyID passed via route: /workspace/:policyID/invite-message */
            policyID: PropTypes.string,
        }),
    }).isRequired,

    ...policyPropTypes,
    ...withLocalizePropTypes,
    network: networkPropTypes.isRequired,
};

const defaultProps = policyDefaultProps;

class WorkspaceInviteMessagePage extends React.Component {
    constructor(props) {
        super(props);

        this.getExcludedUsers = this.getExcludedUsers.bind(this);
        this.openPrivacyURL = this.openPrivacyURL.bind(this);

        const {
            personalDetails,
            userToInvite,
        } = OptionsListUtils.getMemberInviteOptions(
            props.personalDetails,
            props.betas,
            '',
            this.getExcludedUsers(),
        );
        this.state = {
            personalDetails,
            selectedOptions: [],
            userToInvite,
            welcomeNote: this.getWelcomeNote(),
        };
    }

    componentDidMount() {
        const clientPolicyMembers = _.keys(this.props.policyMemberList);
        Policy.openWorkspaceInvitePage(this.props.route.params.policyID, clientPolicyMembers);
    }

    componentDidUpdate(prevProps) {
        if (
            prevProps.preferredLocale !== this.props.preferredLocale
            && this.state.welcomeNote === Localize.translate(prevProps.preferredLocale, 'workspace.inviteMessage.welcomeNote', {workspaceName: this.props.policy.name})
        ) {
            this.setState({welcomeNote: this.getWelcomeNote()});
        }

        const isReconnecting = prevProps.network.isOffline && !this.props.network.isOffline;
        if (!isReconnecting) {
            return;
        }

        const clientPolicyMembers = _.keys(this.props.policyMemberList);
        Policy.openWorkspaceInvitePage(this.props.route.params.policyID, clientPolicyMembers);
    }

    getExcludedUsers() {
        const policyMemberList = lodashGet(this.props, 'policyMemberList', {});
        const usersToExclude = _.filter(_.keys(policyMemberList), policyMember => (
            this.props.network.isOffline
            || policyMemberList[policyMember].pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE
            || !_.isEmpty(policyMemberList[policyMember].errors)
        ));
        return [...CONST.EXPENSIFY_EMAILS, ...usersToExclude];
    }

    /**
     * Gets the welcome note default text
     *
     * @returns {Object}
     */
    getWelcomeNote() {
        return this.props.translate('workspace.inviteMessage.welcomeNote', {
            workspaceName: this.props.policy.name,
        });
    }

    getAvatars() {
        const filteredPersonalDetails = _.pick(this.props.personalDetails, this.props.invitedMembersDraft);
        return _.map(filteredPersonalDetails, personalDetail => ReportUtils.getAvatar(personalDetail.avatar, personalDetail.login));
    }

    getAvatarTooltips() {
        const filteredPersonalDetails = _.pick(this.props.personalDetails, this.props.invitedMembersDraft);
        return _.map(filteredPersonalDetails, personalDetail => Str.removeSMSDomain(personalDetail.login));
    }

    openPrivacyURL(e) {
        e.preventDefault();
        Link.openExternalLink(CONST.PRIVACY_URL);
    }

    /**
     * @returns {Boolean}
     */
    validate() {
        // No validation required as the invite message is optional
        return true;
    }

    onSubmit() {

    }

    render() {
        const policyName = lodashGet(this.props.policy, 'name');

        return (
            <ScreenWrapper includeSafeAreaPaddingBottom={false}>
                <HeaderWithCloseButton
                    title={this.props.translate('workspace.inviteMessage.inviteMessageTitle')}
                    subtitle={policyName}
                    shouldShowGetAssistanceButton
                    guidesCallTaskID={CONST.GUIDES_CALL_TASK_IDS.WORKSPACE_MEMBERS}
                    shouldShowBackButton
                    onBackButtonPress={() => Navigation.goBack()}
                />
                <Form
                    style={[styles.flexGrow1, styles.ph5]}
                    formID={ONYXKEYS.FORMS.LEGAL_NAME_FORM}
                    validate={this.validate}
                    onSubmit={this.onSubmit}
                    submitButtonText={this.props.translate('common.save')}
                    enabledWhenOffline
                >
                    <View style={[styles.mv2]}>
                        <MultipleAvatars
                            size={CONST.AVATAR_SIZE.LARGE}
                            icons={this.getAvatars()}
                            shouldStackHorizontally
                            secondAvatarStyle={[
                                styles.secondAvatarInline,
                            ]}
                            avatarTooltips={this.getAvatarTooltips()}
                        />
                        <Avatar
                            imageStyles={[styles.avatarLarge]}
                            source={this.getAvatars()[0]}
                            size={CONST.AVATAR_SIZE.LARGE}
                        />
                    </View>
                    <View style={[styles.mb5]}>
                        <Text>
                            {this.props.translate('workspace.inviteMessage.inviteMessagePrompt')}
                        </Text>
                    </View>
                    <View style={[styles.mb3]}>
                        <TextInput
                            label={this.props.translate('workspace.inviteMessage.personalMessagePrompt')}
                            autoCompleteType="off"
                            autoCorrect={false}
                            numberOfLines={4}
                            textAlignVertical="top"
                            multiline
                            containerStyles={[styles.workspaceInviteWelcome]}
                            defaultValue={this.state.welcomeNote}
                        />
                    </View>
                </Form>
                <Pressable
                    onPress={this.openPrivacyURL}
                    accessibilityRole="link"
                    href={CONST.PRIVACY_URL}
                    style={[styles.mh5, styles.mb2, styles.alignSelfStart]}
                >
                    <View style={[styles.flexRow]}>
                        <Text style={[styles.mr1, styles.label, styles.link]}>
                            {this.props.translate('common.privacy')}
                        </Text>
                    </View>
                </Pressable>
            </ScreenWrapper>
        );
    }
}

WorkspaceInviteMessagePage.propTypes = propTypes;
WorkspaceInviteMessagePage.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withPolicy,
    withNetwork(),
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
        invitedMembersDraft: {
            key: ({route}) => `${ONYXKEYS.COLLECTION.WORKSPACE_INVITE_MEMBERS_DRAFT}${route.params.policyID.toString()}`,
        },
    }),
)(WorkspaceInviteMessagePage);
