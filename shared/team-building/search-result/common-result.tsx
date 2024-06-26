import * as React from 'react'
import * as Kb from '@/common-adapters'
import * as T from '@/constants/types'
import capitalize from 'lodash/capitalize'
import {
  serviceIdToIconFont,
  serviceIdToAccentColor,
  serviceMapToArray,
  serviceIdToAvatarIcon,
} from '../shared'

export type ResultProps = {
  bottomRow?: React.ReactNode
  displayLabel: string
  followingState: T.TB.FollowingState
  highlight: boolean
  inTeam: boolean
  // They are already a member in the actual team, not this temporary set.
  isPreExistingTeamMember: boolean
  isYou: boolean
  namespace: T.TB.AllowedNamespace
  userId: string
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  prettyName: string
  pictureUrl?: string
  resultForService: T.TB.ServiceIdWithContact
  rightButtons?: React.ReactNode
  services: {[K in T.TB.ServiceIdWithContact]?: string}
  username: string
}

export type CommonResultProps = ResultProps & {
  rowStyle?: Kb.Styles.StylesCrossPlatform
}

/*
 * Case 1: the service is 'keybase' (isKeybaseResult = true)
 *
 *    Top: "{keybaseUsername}" (with following state color)
 *    Bottom: "{prettyName} • {services icons}"
 *
 * Case 2: the service is not keybase
 *
 *    Top: "{serviceUsername}"
 *    Bottom: "{keybaseUsername} • {prettyName} • {services icons}"
 *
 *    {keybaseUsername} if the user is also a keybase user
 *    {prettyName} if the user added it. Can fallback to username if no prettyName is set
 *    {service icons} if the user has proofs
 */
const CommonResult = (props: CommonResultProps) => {
  /*
   * Regardless of the service that is being searched, if we find that a
   * service user is also a keybase user, we also want to show their keybase
   * username, other services, and full name.
   */
  const isKeybaseResult = props.resultForService === 'keybase'
  const keybaseUsername: string | undefined = props.services['keybase']
  const serviceUsername = props.services[props.resultForService]
  const onAdd = !props.isPreExistingTeamMember ? () => props.onAdd(props.userId) : undefined
  const onRemove = !props.isPreExistingTeamMember ? () => props.onRemove(props.userId) : undefined

  return (
    <Kb.ClickableBox onClick={props.inTeam ? onRemove : onAdd}>
      <Kb.Box2
        className="hover_background_color_blueLighter2 hover_container"
        direction="horizontal"
        fullWidth={true}
        centerChildren={true}
        style={Kb.Styles.collapseStyles([
          styles.rowContainer,
          props.rowStyle,
          props.highlight ? styles.highlighted : undefined,
        ])}
      >
        <Avatar
          resultForService={props.resultForService}
          keybaseUsername={keybaseUsername}
          pictureUrl={props.pictureUrl}
        />
        <Kb.Box2 direction="vertical" style={styles.username}>
          {serviceUsername ? (
            <>
              <Username
                followingState={props.followingState}
                isKeybaseResult={isKeybaseResult}
                keybaseUsername={keybaseUsername}
                username={serviceUsername || ''}
              />
              {props.bottomRow ?? (
                <BottomRow
                  displayLabel={props.displayLabel}
                  followingState={props.followingState}
                  isKeybaseResult={isKeybaseResult}
                  isPreExistingTeamMember={props.isPreExistingTeamMember}
                  keybaseUsername={keybaseUsername}
                  prettyName={props.prettyName}
                  services={props.services}
                  username={serviceUsername || ''}
                />
              )}
            </>
          ) : (
            <>
              <Kb.Text type="BodySemibold" lineClamp={1}>
                {props.prettyName}
              </Kb.Text>
              {!!props.displayLabel && props.displayLabel !== props.prettyName && (
                <Kb.Text type="BodySmall" lineClamp={1}>
                  {props.displayLabel}
                </Kb.Text>
              )}
            </>
          )}
        </Kb.Box2>
        <Kb.Box2
          gap="tiny"
          centerChildren={true}
          direction="horizontal"
          className="result-actions"
          style={props.highlight ? styles.actionButtonsHighlighted : undefined}
        >
          {/* Renders checkbox for new-chat and team-building, and chat buttons + dropdown for people search */}
          {props.rightButtons ?? null}
        </Kb.Box2>
      </Kb.Box2>
    </Kb.ClickableBox>
  )
}

const avatarSize = Kb.Styles.isMobile ? 48 : 32
const dotSeparator = '•'

const isPreExistingTeamMemberText = (prettyName: string, username: string) =>
  `${prettyName && prettyName !== username ? prettyName + ` ${dotSeparator} ` : ''}Already in team`

const textWithConditionalSeparator = (text: string, conditional: boolean) =>
  `${text}${conditional ? ` ${dotSeparator}` : ''}`

const Avatar = ({
  resultForService,
  keybaseUsername,
  pictureUrl,
}: {
  keybaseUsername?: string
  resultForService: T.TB.ServiceIdWithContact
  pictureUrl?: string
}) => {
  if (keybaseUsername) {
    return <Kb.Avatar size={avatarSize} username={keybaseUsername} />
  } else if (pictureUrl) {
    return <Kb.Avatar size={avatarSize} imageOverrideUrl={pictureUrl} />
  } else if (resultForService === 'keybase' || T.TB.isContactServiceId(resultForService)) {
    return <Kb.Avatar size={avatarSize} username="invalid username for placeholder avatar" />
  }

  return (
    <Kb.Icon
      fontSize={avatarSize}
      type={serviceIdToAvatarIcon(resultForService)}
      colorOverride={serviceIdToAccentColor(resultForService)}
    />
  )
}

// If service icons are the only item present in the bottom row, then don't apply margin-left to the first icon
const ServicesIcons = (props: {
  services: {[K in T.TB.ServiceIdWithContact]?: string}
  prettyName: string
  displayLabel: string
  isKeybaseResult: boolean
  keybaseUsername?: string
}) => {
  const serviceIds = serviceMapToArray(props.services)
  // When the result is from a non-keybase service, we could have:
  //  1. keybase username
  //  2. pretty name or display label. prettyName can fallback to username if no prettyName is set.
  //
  // When the result is from the keybase service, we could have:
  //  1. prettyName that matches the username - in which case it will be hidden
  //  1. No prettyName and also no displayLabel
  const firstIconNoMargin = !props.isKeybaseResult
    ? !props.keybaseUsername && !props.prettyName && !props.displayLabel
    : props.prettyName
      ? props.prettyName === props.keybaseUsername
      : !props.displayLabel
  return (
    <Kb.Box2 direction="horizontal" fullWidth={Kb.Styles.isMobile} style={styles.services}>
      {serviceIds.map((serviceName, index) => {
        const iconStyle =
          firstIconNoMargin && index === 0
            ? Kb.Styles.collapseStyles([styles.serviceIcon, {marginLeft: 0}])
            : styles.serviceIcon
        // On desktop the styles need to be applied to the box parent if they are to work correctly
        return (
          <Kb.Box2
            direction="vertical"
            key={serviceName}
            tooltip={`${props.services[serviceName]} on ${capitalize(serviceName)}`}
          >
            <Kb.Icon sizeType="Small" type={serviceIdToIconFont(serviceName)} style={iconStyle} />
          </Kb.Box2>
        )
      })}
    </Kb.Box2>
  )
}

const FormatPrettyName = (props: {
  displayLabel: string
  prettyName: string
  username: string
  services: Array<T.TB.ServiceIdWithContact>
  keybaseUsername?: string
  showServicesIcons: boolean
}) =>
  props.prettyName &&
  props.prettyName !== props.username &&
  // When the searching service is not keybase, but the service user is also a keybase user, hide their pretty name if it matches their keybase username
  // E.g. Github
  //   | chriscoyne
  //   | chris • chris (prettyName) • {serviceIcons}
  props.prettyName !== props.keybaseUsername ? (
    <Kb.Text type="BodySmall" lineClamp={1}>
      {textWithConditionalSeparator(props.prettyName, props.showServicesIcons && !!props.services.length)}
    </Kb.Text>
  ) : props.displayLabel ? (
    <Kb.Text type="BodySmall" lineClamp={1}>
      {textWithConditionalSeparator(props.displayLabel, props.showServicesIcons && !!props.services.length)}
    </Kb.Text>
  ) : null

const MobileScrollView = ({children}: {children: React.ReactNode}) =>
  Kb.Styles.isMobile ? (
    <Kb.ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={1000}
      contentContainerStyle={styles.bottomRowScrollContainer}
    >
      {children}
    </Kb.ScrollView>
  ) : (
    <>{children}</>
  )

const BottomRow = (props: {
  isKeybaseResult: boolean
  username: string
  isPreExistingTeamMember: boolean
  keybaseUsername?: string
  followingState: T.TB.FollowingState
  displayLabel: string
  prettyName: string
  services: {[K in T.TB.ServiceIdWithContact]?: string}
}) => {
  const serviceUserIsAlsoKeybaseUser = !props.isKeybaseResult && props.keybaseUsername
  const showServicesIcons = props.isKeybaseResult || !!props.keybaseUsername
  const keybaseUsernameComponent = serviceUserIsAlsoKeybaseUser ? (
    <>
      <Kb.Text
        type="BodyBold"
        style={followingStateToStyle(props.keybaseUsername ? props.followingState : 'NoState')}
        lineClamp={1}
      >
        {props.keybaseUsername}
      </Kb.Text>
      <Kb.Text type="BodySmall">&nbsp;</Kb.Text>
      <Kb.Text type="BodySmall">{dotSeparator}</Kb.Text>
      <Kb.Text type="BodySmall">&nbsp;</Kb.Text>
    </>
  ) : null

  return (
    <Kb.Box2 direction="horizontal" fullWidth={true} alignSelf="flex-start" style={styles.bottomRowContainer}>
      <MobileScrollView>
        {keybaseUsernameComponent}
        {props.isPreExistingTeamMember ? (
          <Kb.Text type="BodySmall" lineClamp={1}>
            {isPreExistingTeamMemberText(props.prettyName, props.username)}
          </Kb.Text>
        ) : (
          <>
            <FormatPrettyName
              displayLabel={props.displayLabel}
              prettyName={props.prettyName}
              username={props.username}
              keybaseUsername={props.keybaseUsername}
              services={serviceMapToArray(props.services)}
              showServicesIcons={showServicesIcons}
            />
            {/* When the service result does not have any information other than
            the service username we don't want to show the service icons since
            there will only be one item */}
            {showServicesIcons ? (
              <ServicesIcons
                services={props.services}
                isKeybaseResult={props.isKeybaseResult}
                prettyName={props.prettyName}
                displayLabel={props.displayLabel}
                keybaseUsername={props.keybaseUsername}
              />
            ) : null}
          </>
        )}
      </MobileScrollView>
    </Kb.Box2>
  )
}

const Username = (props: {
  followingState: T.TB.FollowingState
  isKeybaseResult: boolean
  keybaseUsername?: string
  username: string
}) => (
  <Kb.Text
    type={props.isKeybaseResult && props.keybaseUsername ? 'BodyBold' : 'BodySemibold'}
    style={followingStateToStyle(
      props.isKeybaseResult && props.keybaseUsername ? props.followingState : 'NoState'
    )}
  >
    {props.username}
  </Kb.Text>
)

export const userResultHeight = Kb.Styles.isMobile ? Kb.Styles.globalMargins.xlarge : 48
const styles = Kb.Styles.styleSheetCreate(() => ({
  actionButtonsHighlighted: Kb.Styles.platformStyles({
    isElectron: {
      visibility: 'visible',
    },
  }),
  bottomRowContainer: {
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  bottomRowScrollContainer: {
    alignItems: 'baseline',
    display: 'flex',
  },
  contactName: {
    lineHeight: 22,
  },
  highlighted: Kb.Styles.platformStyles({
    isElectron: {
      backgroundColor: Kb.Styles.globalColors.blueLighter2,
      borderRadius: Kb.Styles.borderRadius,
    },
  }),
  keybaseServiceIcon: {
    marginRight: Kb.Styles.globalMargins.xtiny,
  },
  // Default padding to people search vlaues:
  // top/bottom: 8, left/right: 12
  //
  // Chat and team building have larger right padding
  rowContainer: {
    ...Kb.Styles.padding(Kb.Styles.globalMargins.tiny, Kb.Styles.globalMargins.xsmall),
    height: userResultHeight,
  },
  serviceIcon: {
    marginLeft: Kb.Styles.globalMargins.xtiny,
    marginTop: Kb.Styles.globalMargins.xtiny,
  },
  services: {
    justifyContent: 'flex-start',
  },
  username: {
    flex: 1,
    marginLeft: Kb.Styles.globalMargins.small,
  },
}))

const followingStateToStyle = (followingState: T.TB.FollowingState) => {
  return {
    Following: {
      color: Kb.Styles.globalColors.greenDark,
    },
    NoState: {
      color: Kb.Styles.globalColors.black,
    },
    NotFollowing: {
      color: Kb.Styles.globalColors.blueDark,
    },
    You: {
      color: Kb.Styles.globalColors.black,
    },
  }[followingState]
}

export default CommonResult
