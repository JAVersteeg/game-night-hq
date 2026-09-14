export type AppStackParamList = {
  GroupList: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  /**
   * Only the id travels in params. The group itself is read from the groups list cache, so the
   * header title and stats render without a round trip and stay correct if the group is ever
   * renamed.
   */
  GroupDashboard: { groupId: string };
  GroupSettings: { groupId: string };
  Profile: undefined;
};
